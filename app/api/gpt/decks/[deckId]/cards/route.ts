import { NextResponse } from "next/server";
import { getGptForwardConfig, isGptForwardingConfigured, resolveDeckAccessFromRequest } from "@/lib/gpt";

export const runtime = "nodejs";

type CardInput = {
  front?: string;
  back?: string;
  notes?: string;
  tags?: string[];
};

type AddCardsBody = {
  cards?: CardInput[];
  source?: string;
};

function normalizeCards(cards: CardInput[]) {
  return cards.map((card, index) => ({
    index,
    front: String(card.front ?? "").trim(),
    back: String(card.back ?? "").trim(),
    notes: typeof card.notes === "string" ? card.notes.trim() : null,
    tags: Array.isArray(card.tags)
      ? card.tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
          .slice(0, 20)
      : [],
  }));
}

export async function POST(request: Request, { params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;

  let access;

  try {
    access = await resolveDeckAccessFromRequest(request, deckId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : message === "Deck not found." ? 404 : 403;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }

  const body = (await request.json().catch(() => null)) as AddCardsBody | null;
  const cards = Array.isArray(body?.cards) ? normalizeCards(body.cards) : [];

  if (!cards.length) {
    return NextResponse.json(
      {
        error: "Missing cards array.",
        nextStep: "Send a JSON body with cards: [{ front, back, notes?, tags? }].",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const invalidCard = cards.find((card) => !card.front || !card.back);
  if (invalidCard) {
    return NextResponse.json(
      {
        error: "Each card requires both front and back text.",
        nextStep: `Fix card at index ${invalidCard.index} and retry.`,
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const config = getGptForwardConfig();
  const requestedBy = body?.source?.trim() || "superanki-gpt";

  if (!config || !isGptForwardingConfigured()) {
    return NextResponse.json(
      {
        accepted: false,
        error: "GPT deck writes are not wired to a trusted backend yet.",
        nextStep:
          "Set SUPERANKI_GPT_API_URL and SUPERANKI_GPT_API_TOKEN to forward validated GPT card batches into your deck-writing service.",
        received: {
          deckSyncId: access.deckSyncId,
          userId: access.userId,
          authMode: access.authMode,
          cards: cards.length,
        },
      },
      { status: 501, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (cards.length > config.maxCardsPerRequest) {
    return NextResponse.json(
      {
        error: "Too many cards in one request.",
        nextStep: `Keep each GPT write under ${config.maxCardsPerRequest} cards.`,
      },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify({
        source: requestedBy,
        userId: access.userId,
        userEmail: access.email,
        deckSyncId: access.deckSyncId,
        cards,
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        error: "The configured GPT card service did not respond.",
        nextStep: "Verify SUPERANKI_GPT_API_URL, networking, and upstream health.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = (await upstreamResponse.json().catch(() => null)) as Record<string, unknown> | null;

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        error: "The GPT card service rejected the request.",
        upstreamStatus: upstreamResponse.status,
        upstream: payload,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      accepted: true,
      message: "Cards forwarded to the deck-writing service.",
      upstream: payload,
      deckSyncId: access.deckSyncId,
      receivedCards: cards.length,
    },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
