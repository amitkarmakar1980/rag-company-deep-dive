import { NextRequest, NextResponse } from "next/server";
import { extractJobDetailsFromUrl } from "@/lib/ingestion/extractJobDetails";

// POST /api/deep-dive/extract-jd
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log("[API] Received extraction request for URL:", url);
    if (!url || typeof url !== "string") {
      console.log("[API] Invalid or missing URL");
      return NextResponse.json({ error: "Missing or invalid URL." }, { status: 400 });
    }
    // Use a helper to fetch and extract job details from the URL
    const details = await extractJobDetailsFromUrl(url);
    if (!details) {
      console.log("[API] Extraction failed or returned null for URL:", url);
      return NextResponse.json({ error: "Could not extract job details." }, { status: 422 });
    }
    console.log("[API] Extraction succeeded for URL:", url, details);
    return NextResponse.json(details);
  } catch (err) {
    console.error("[API] Extraction error:", err);
    return NextResponse.json({ error: "Failed to extract job details." }, { status: 500 });
  }
}
