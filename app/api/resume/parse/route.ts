import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/resume/parse
 *
 * Accepts a multipart form with a single "file" field (.txt, .pdf, .doc, .docx).
 * Returns { text: string } — the extracted plain text.
 * Used by client-side panels that need text before storing to localStorage.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    let text = "";

    if (name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".pdf")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a .pdf, .docx, .doc, or .txt file." },
        { status: 422 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from this file. Try pasting the text instead." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : "";
    console.error("[resume/parse] Failed to parse file:", msg);
    console.error("[resume/parse] Stack:", stack);
    return NextResponse.json(
      { error: `Parse error: ${msg}` },
      { status: 422 }
    );
  }
}
