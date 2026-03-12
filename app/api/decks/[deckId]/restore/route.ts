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
        error: error.message,
        nextStep: "Ensure the deck_sync table exists and the authenticated user can read the requested deck row.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!backup) {
    return NextResponse.json(
      {
        error: "Deck backup not found.",
        nextStep: "Refresh the deck list and retry against a valid backup row for this account.",
      },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!backup.s3_key) {
    return NextResponse.json(
      {
        error: "Restore is blocked because this deck backup does not have an object-storage key yet.",
        nextStep: "Write the uploaded backup object key into deck_sync.s3_key before attempting restore preparation.",
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error: "Restore is blocked because object-storage signing is not configured on the web app.",
        nextStep:
          "Set SUPERANKI_STORAGE_ENDPOINT, SUPERANKI_STORAGE_BUCKET, SUPERANKI_STORAGE_REGION, SUPERANKI_STORAGE_ACCESS_KEY_ID, and SUPERANKI_STORAGE_SECRET_ACCESS_KEY.",
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
      nextStep:
        "Use this short-lived signed URL from a trusted restore client or worker. The browser UI does not apply the backup locally.",
    },
    { status: 200, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
