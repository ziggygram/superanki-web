import { NextResponse } from "next/server";
import { isImportJobStatus } from "@/lib/import-jobs";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const token = process.env.SUPERANKI_IMPORT_CALLBACK_TOKEN?.trim() || process.env.SUPERANKI_IMPORT_API_TOKEN?.trim();
  const authHeader = request.headers.get("authorization");

  if (!token || authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { jobId } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const requestedStatus = typeof body?.status === "string" ? body.status : null;

  if (!requestedStatus || !isImportJobStatus(requestedStatus)) {
    return NextResponse.json(
      {
        error: "Invalid import job status.",
        nextStep: "Send one of: pending, queued, processing, completed, failed, cancelled.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const update = {
    status: requestedStatus,
    worker_job_id: typeof body?.workerJobId === "string" ? body.workerJobId : typeof body?.jobId === "string" ? body.jobId : null,
    worker_status: typeof body?.workerStatus === "string" ? body.workerStatus : requestedStatus,
    error_message: typeof body?.error === "string" ? body.error : typeof body?.message === "string" && requestedStatus === "failed" ? body.message : null,
    completed_at: requestedStatus === "completed" || requestedStatus === "failed" || requestedStatus === "cancelled" ? now : null,
  };

  const { data, error } = await supabase
    .from("import_jobs")
    .update(update)
    .eq("id", jobId)
    .select("id, status, worker_job_id, worker_status, completed_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: "Import job update failed.",
        details: error.message,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error: "Import job not found.",
      },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ ok: true, importJob: data }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
