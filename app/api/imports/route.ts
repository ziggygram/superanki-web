import { NextResponse } from "next/server";
import { formatImportLimit, getImportConfig, isSupportedImportFilename } from "@/lib/imports";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
        nextStep: `Keep imports under ${formatImportLimit(maxBytes)} or raise SUPERANKI_IMPORT_MAX_BYTES on the server.`,
      },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!config) {
    return NextResponse.json(
      {
        error: "Web import handoff is not configured yet.",
        nextStep:
          "Set SUPERANKI_IMPORT_API_URL and SUPERANKI_IMPORT_API_TOKEN to forward browser uploads to a trusted import worker.",
        file: {
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
        },
      },
      { status: 501, headers: { "Cache-Control": "no-store" } },
    );
  }

  const upstreamFormData = new FormData();
  upstreamFormData.set("file", file, file.name);
  upstreamFormData.set("userId", user.id);
  upstreamFormData.set("source", "superanki-web");

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
    return NextResponse.json(
      {
        error: "The configured import service did not respond.",
        nextStep: "Verify SUPERANKI_IMPORT_API_URL, networking, and the upstream service health.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown = null;

  try {
    payload = await upstreamResponse.json();
  } catch {
    payload = null;
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        error: "The import service rejected the package.",
        nextStep: "Inspect the upstream import worker logs and payload validation rules.",
        upstreamStatus: upstreamResponse.status,
        upstream: payload,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      message: "Import job queued with the configured worker.",
      nextStep: "Persist job history in Supabase next so the web UI can show durable progress and results.",
      upstream: payload,
    },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
