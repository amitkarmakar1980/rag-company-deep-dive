import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export const runtime = "nodejs";

/**
 * GET /api/overlay/[requestId]
 *
 * Returns the most recent candidate overlay for this deep dive request.
 * Response shape:
 *   { exists: false }                                         — no overlay yet
 *   { exists: true, status: "pending"|"generating", overlayId }
 *   { exists: true, status: "completed", overlayId, data: CandidateOverlayData }
 *   { exists: true, status: "failed", overlayId, error }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  // Get most recent overlay for this request
  const { data: overlay } = await supabaseAdmin
    .from("candidate_overlays")
    .select("id, status, overlay_json, error_message, updated_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!overlay) {
    return NextResponse.json({ exists: false, resumeOnFile: false });
  }

  return NextResponse.json({
    exists: true,
    overlayId: overlay.id,
    status: overlay.status,
    data: overlay.status === "completed" ? overlay.overlay_json : null,
    error: overlay.status === "failed" ? overlay.error_message : null,
    updatedAt: overlay.updated_at,
  });
}
