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
        error: "We couldn’t open this backup right now.",
        nextStep: "Refresh the page and try again.",
      },
      { status: 500 },
    );
  }

  if (!backup) {
    return NextResponse.json({ error: "This backup is no longer available." }, { status: 404 });
  }

  if (!backup.s3_key) {
    return NextResponse.json(
      {
        error: "This backup is still being prepared.",
        nextStep: "Try again after the latest sync finishes.",
      },
      { status: 409 },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error: "Backup downloads are temporarily unavailable.",
        nextStep: "Please try again later.",
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
