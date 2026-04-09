import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { generateOverlay } from "@/lib/report/generateOverlay";
import { createRouteClient } from "@/lib/db/supabase-server";

export const runtime = "nodejs";

/**
 * POST /api/resume/upload
 *
 * Accepts either:
 *   - JSON body: { requestId: string, resumeText: string }
 *   - FormData: fields "requestId", "resumeText" OR file "resumeFile" (.txt or .pdf)
 *
 * Creates a candidate_resume record and kicks off async overlay generation.
 * Returns { overlayId } immediately; client polls /api/overlay/[requestId].
 */
export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createRouteClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  // Ensure user exists in custom users table (FK requirement)
  await supabaseAdmin
    .from("users")
    .upsert({ id: userId, email: user.email ?? "" }, { onConflict: "id", ignoreDuplicates: true });

  let requestId: string | null = null;
  let resumeText: string | null = null;
  let reuseExisting = false;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    requestId = form.get("requestId") as string | null;
    resumeText = form.get("resumeText") as string | null;

    const file = form.get("resumeFile") as File | null;
    if (file && !resumeText) {
      const name = file.name.toLowerCase();
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (name.endsWith(".pdf")) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require("pdf-parse");
          const parsed = await pdfParse(buffer);
          resumeText = parsed.text;
        } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          resumeText = result.value;
        } else {
          resumeText = buffer.toString("utf-8");
        }
      } catch (e) {
        return NextResponse.json(
          { error: "Could not parse the file. Please paste your resume as text instead." },
          { status: 422 }
        );
      }
    }
  } else {
    const body = await req.json();
    requestId = body.requestId;
    resumeText = body.resumeText;
    reuseExisting = !!body.reuseExisting;
  }

  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  // Verify the request belongs to the current user
  const { data: dr } = await supabaseAdmin
    .from("deep_dive_requests")
    .select("id, user_id")
    .eq("id", requestId)
    .single();

  if (!dr || dr.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If reuseExisting, find the existing resume record for this request via candidate_overlays
  if (reuseExisting && !resumeText?.trim()) {
    const { data: existingOverlay } = await supabaseAdmin
      .from("candidate_overlays")
      .select("resume_id")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!existingOverlay?.resume_id) {
      return NextResponse.json({ error: "No existing resume found for this request" }, { status: 404 });
    }

    // Create a new overlay from the existing resume record
    const { data: overlay, error: overlayErr } = await supabaseAdmin
      .from("candidate_overlays")
      .insert({
        request_id: requestId,
        resume_id: existingOverlay.resume_id,
        status: "pending",
        overlay_json: null,
        error_message: null,
      })
      .select("id")
      .single();

    if (overlayErr || !overlay) {
      console.error("[resume/upload] Failed to create reuse overlay:", overlayErr);
      return NextResponse.json({ error: "Failed to create overlay record" }, { status: 500 });
    }

    setImmediate(() => {
      generateOverlay(overlay.id).catch((err) => {
        console.error("[resume/upload] Reuse overlay generation failed:", err);
      });
    });

    return NextResponse.json({ overlayId: overlay.id, resumeId: existingOverlay.resume_id });
  }

  if (!resumeText?.trim()) {
    return NextResponse.json(
      { error: "requestId and resume text are required" },
      { status: 400 }
    );
  }

  // Create resume record
  const { data: resume, error: resumeErr } = await supabaseAdmin
    .from("candidate_resumes")
    .insert({ user_id: userId, raw_text: resumeText.trim(), status: "parsed" })
    .select("id")
    .single();

  if (resumeErr || !resume) {
    console.error("[resume/upload] Failed to create resume:", resumeErr);
    return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
  }

  // Create (or replace) overlay record
  const { data: overlay, error: overlayErr } = await supabaseAdmin
    .from("candidate_overlays")
    .upsert(
      {
        request_id: requestId,
        resume_id: resume.id,
        status: "pending",
        overlay_json: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "request_id,resume_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (overlayErr || !overlay) {
    console.error("[resume/upload] Failed to create overlay:", overlayErr);
    return NextResponse.json({ error: "Failed to create overlay record" }, { status: 500 });
  }

  // Fire off async overlay generation (non-blocking)
  setImmediate(() => {
    generateOverlay(overlay.id).catch((err) => {
      console.error("[resume/upload] Async overlay generation failed:", err);
    });
  });

  return NextResponse.json({ overlayId: overlay.id, resumeId: resume.id, resumeText: resumeText.trim() });
}
