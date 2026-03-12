import { NextResponse } from "next/server";
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
    .select("id, user_id, deck_name, s3_key")
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

  if (!process.env.SUPERANKI_STORAGE_SIGNING_KEY) {
    return NextResponse.json(
      {
        error: "Private backup download signing is not configured on the web app yet.",
        nextStep:
          "Add server-side Hetzner S3 signing here using deck_sync.s3_key. Keep credentials server-only and return either a short-lived signed URL or stream the object through this route.",
        backup: {
          id: backup.id,
          deckName: backup.deck_name,
          s3Key: backup.s3_key,
        },
      },
      { status: 501 },
    );
  }

  return NextResponse.json(
    {
      error: "Download signing is not implemented yet.",
      nextStep:
        "Replace this response with real Hetzner S3 request signing once storage credentials are wired into the deployment environment.",
    },
    { status: 501 },
  );
}
