import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  getDeepDiveRequest,
  deleteReportForRequest,
  deleteSourcesForRequest,
} from "@/lib/db/operations";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;

    const supabase = createRouteClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const request = await getDeepDiveRequest(requestId);
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (request.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Delete in order: overlays → report (cascade sections) → sources (cascade chunks) → request
    await supabaseAdmin.from("candidate_overlays").delete().eq("request_id", requestId);
    await deleteReportForRequest(requestId);
    await deleteSourcesForRequest(requestId);
    await supabaseAdmin.from("deep_dive_requests").delete().eq("id", requestId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete deep dive error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
