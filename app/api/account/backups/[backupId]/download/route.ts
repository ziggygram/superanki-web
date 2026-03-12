import { NextResponse } from "next/server";
import { buildPresignedDownloadUrl, inferBackupFilename, isStorageConfigured } from "@/lib/object-storage";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ backupId: string }> },
) {
  const { backupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: backup, error } = await supabase
    .from("deck_sync")
    .select("id, user_id, deck_name, s3_key, last_synced_at, checksum")
    .eq("id", backupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        nextStep:
          "Ensure the deck_sync table exists and this user has access to the requested backup row.",
      },
      { status: 500 },
    );
  }

  if (!backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  if (!backup.s3_key) {
    return NextResponse.json(
      {
        error: "This backup row does not have an object-storage key yet.",
        nextStep: "Write the generated object key into deck_sync.s3_key during the iOS upload flow.",
      },
      { status: 409 },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error: "Private backup download signing is not configured on the web app yet.",
        nextStep:
          "Set SUPERANKI_STORAGE_ENDPOINT, SUPERANKI_STORAGE_BUCKET, SUPERANKI_STORAGE_REGION, SUPERANKI_STORAGE_ACCESS_KEY_ID, and SUPERANKI_STORAGE_SECRET_ACCESS_KEY in the deployment environment.",
        backup: {
          id: backup.id,
          deckName: backup.deck_name,
          s3Key: backup.s3_key,
        },
      },
      { status: 501 },
    );
  }

  const downloadFilename = inferBackupFilename(backup.deck_name, backup.s3_key);
  const signedUrl = buildPresignedDownloadUrl({
    key: backup.s3_key,
    downloadFilename,
    expiresInSeconds: 60,
  });

  const response = NextResponse.redirect(signedUrl, 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Content-Disposition", `attachment; filename="${downloadFilename}"`);
  response.headers.set("X-SuperAnki-Backup-Id", String(backup.id));

  if (backup.last_synced_at) {
    response.headers.set("X-SuperAnki-Last-Synced-At", backup.last_synced_at);
  }

  if (backup.checksum) {
    response.headers.set("X-SuperAnki-Checksum", backup.checksum);
  }

  return response;
}
