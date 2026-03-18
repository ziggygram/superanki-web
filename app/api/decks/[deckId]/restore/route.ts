import { NextResponse } from "next/server";
import { buildPresignedDownloadUrl, inferBackupFilename, isStorageConfigured } from "@/lib/object-storage";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const { deckId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { data: backup, error } = await supabase
    .from("deck_sync")
    .select("id, user_id, deck_id, deck_name, s3_key, last_synced_at, checksum")
    .eq("id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: "We couldn’t prepare this backup right now.",
        nextStep: "Refresh the page and try again.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!backup) {
    return NextResponse.json(
      {
        error: "This backup is no longer available.",
        nextStep: "Choose another deck and try again.",
      },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!backup.s3_key) {
    return NextResponse.json(
      {
        error: "This backup is still being prepared.",
        nextStep: "Try again after the latest sync finishes.",
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error: "Backup downloads are temporarily unavailable.",
        nextStep: "Please try again later.",
      },
      { status: 501, headers: { "Cache-Control": "no-store" } },
    );
  }

  const downloadFilename = inferBackupFilename(backup.deck_name, backup.s3_key);
  const downloadUrl = buildPresignedDownloadUrl({
    key: backup.s3_key,
    downloadFilename,
    expiresInSeconds: 60,
  });

  return NextResponse.json(
    {
      restore: {
        backupId: backup.id,
        deckId: backup.deck_id,
        deckName: backup.deck_name,
        checksum: backup.checksum,
        downloadFilename,
        downloadUrl,
        expiresInSeconds: 60,
        lastSyncedAt: backup.last_synced_at,
      },
      nextStep: "Open this secure link in your restore client within the next minute.",
    },
    { status: 200, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
