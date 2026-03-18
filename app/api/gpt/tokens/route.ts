import { NextResponse } from "next/server";
import { signDeckAccessToken, getGptTokenTtlSeconds, isGptTokenIssuanceReady } from "@/lib/gpt";
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

  if (!isGptTokenIssuanceReady()) {
    return NextResponse.json(
      {
        error: "Token generation is temporarily unavailable.",
        nextStep: "Please try again later.",
      },
      { status: 501, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = (await request.json().catch(() => null)) as { deckId?: string } | null;
  const deckId = String(body?.deckId ?? "").trim();

  if (!deckId) {
    return NextResponse.json(
      {
        error: "Missing deckId.",
        nextStep: "Generate a token from a real deck page so the token can be scoped to a single deck you own.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: deck, error } = await supabase
    .from("deck_sync")
    .select("id, deck_name")
    .eq("id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: "Could not verify deck ownership.",
        nextStep: "Refresh the page and try again.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!deck) {
    return NextResponse.json(
      {
        error: "Deck not found.",
        nextStep: "Open a deck that belongs to this account before generating a GPT token.",
      },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const expiresInSeconds = getGptTokenTtlSeconds();
  const token = signDeckAccessToken({
    sub: user.id,
    email: user.email ?? null,
    deckSyncId: deck.id,
  });

  return NextResponse.json(
    {
      token,
      tokenType: "Bearer",
      expiresInSeconds,
      deck: {
        id: deck.id,
        name: deck.deck_name,
      },
      openApiUrl: `${new URL(request.url).origin}/api/openapi/gpt`,
      actionUrl: `${new URL(request.url).origin}/api/gpt/decks/${deck.id}/cards`,
      nextStep: "Paste this token into your GPT action or agent config as a Bearer token. It is scoped to this deck and expires automatically.",
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
