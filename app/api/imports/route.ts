import { NextResponse } from "next/server";
import { formatImportLimit, getImportConfig, isSupportedImportFilename } from "@/lib/imports";
import { deriveSourceExtension, getImportCallbackConfig } from "@/lib/import-jobs";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function updateJobStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: number | null,
  values: Record<string, string | number | null>,
) {
  if (!jobId) return;

  await supabase.from("import_jobs").update(values).eq("id", jobId);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const deckId = String(formData.get("deckId") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: "Missing import file.",
        nextStep: "Attach an .apkg or .colpkg file before creating an import job.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isSupportedImportFilename(file.name)) {
    return NextResponse.json(
      {
        error: "Unsupported import file type.",
        nextStep: "Use a standard Anki .apkg or .colpkg package.",
      },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  const config = getImportConfig();
  const maxBytes = config?.maxBytes ?? 50 * 1024 * 1024;

  if (file.size <= 0) {
    return NextResponse.json(
      {
        error: "The selected file is empty.",
        nextStep: "Choose a valid Anki package with exported deck data.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: "The selected file exceeds the configured import size limit.",
        nextStep: `Keep imports under ${formatImportLimit(maxBytes)} and try again.`,
      },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let deckSyncId: number | null = null;

  if (deckId) {
    const { data: deck, error: deckError } = await supabase
      .from("deck_sync")
      .select("id")
      .eq("id", deckId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (deckError) {
      return NextResponse.json(
        {
          error: "Could not verify the selected deck.",
          nextStep: "Refresh the page and try again.",
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!deck) {
      return NextResponse.json(
        {
          error: "Deck not found.",
          nextStep: "Open a valid deck detail page and retry the import from there.",
        },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    deckSyncId = deck.id;
  }

  let jobId: number | null = null;
  let importJobsReady = true;

  const { data: createdJob, error: createJobError } = await supabase
    .from("import_jobs")
    .insert({
      user_id: user.id,
      deck_sync_id: deckSyncId,
      source_filename: file.name,
      file_size_bytes: file.size,
      file_content_type: file.type || "application/octet-stream",
      source_extension: deriveSourceExtension(file.name),
      status: "pending",
      worker_status: config ? "handoff_pending" : "blocked_unconfigured",
    })
    .select("id")
    .single();

  if (createJobError) {
    if (createJobError.code === "42P01" || createJobError.code === "PGRST106") {
      importJobsReady = false;
    } else {
      return NextResponse.json(
        {
          error: "Import job could not be persisted.",
          nextStep: "Please try again.",
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  } else {
    jobId = createdJob.id;
  }

  if (!config) {
    await updateJobStatus(supabase, jobId, {
      status: "failed",
      worker_status: "blocked_unconfigured",
      error_message: "Web import handoff is not configured on the server.",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Web imports are temporarily unavailable.",
        nextStep: "Please try again later.",
        file: {
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
        },
        importJob: jobId ? { id: jobId, status: "failed" } : null,
        schemaReady: importJobsReady,
      },
      { status: 501, headers: { "Cache-Control": "no-store" } },
    );
  }

  const upstreamFormData = new FormData();
  upstreamFormData.set("file", file, file.name);
  upstreamFormData.set("userId", user.id);
  upstreamFormData.set("source", "superanki-web");

  if (jobId) {
    upstreamFormData.set("importJobId", String(jobId));
  }

  if (deckSyncId) {
    upstreamFormData.set("deckSyncId", String(deckSyncId));
  }

  const callbackConfig = getImportCallbackConfig();

  if (jobId && callbackConfig) {
    upstreamFormData.set("callbackUrl", `${callbackConfig.url}/api/imports/${jobId}/callback`);
    upstreamFormData.set("callbackToken", callbackConfig.token);
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: upstreamFormData,
      cache: "no-store",
    });
  } catch {
    await updateJobStatus(supabase, jobId, {
      status: "failed",
      worker_status: "handoff_unreachable",
      error_message: "The configured import service did not respond.",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "The configured import service did not respond.",
        nextStep: "Please try again in a few minutes.",
        importJob: jobId ? { id: jobId, status: "failed" } : null,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await upstreamResponse.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!upstreamResponse.ok) {
    await updateJobStatus(supabase, jobId, {
      status: "failed",
      worker_status: String(payload?.status ?? `upstream_${upstreamResponse.status}`),
      error_message: "The import service rejected the package.",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "The import service rejected the package.",
        nextStep: "Check the file and try again.",
        importJob: jobId ? { id: jobId, status: "failed" } : null,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const workerJobId = typeof payload?.jobId === "string" ? payload.jobId : typeof payload?.id === "string" ? payload.id : null;
  const workerStatus = typeof payload?.status === "string" ? payload.status : "queued";

  await updateJobStatus(supabase, jobId, {
    status: "queued",
    worker_job_id: workerJobId,
    worker_status: workerStatus,
    error_message: null,
  });

  return NextResponse.json(
    {
      message: "Import started",
      nextStep: callbackConfig
        ? "You can follow progress from the import history below."
        : "We’ve started the import. Progress updates may take a moment to appear.",
      importJob: jobId ? { id: jobId, status: "queued", workerJobId } : null,
      schemaReady: importJobsReady,
      callbackReady: Boolean(callbackConfig),
    },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
