import { NextResponse } from "next/server";
import { insertDeckCardsDirect, resolveDeckAccessFromRequest } from "@/lib/gpt";

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

  const requestedBy = body?.source?.trim() || "superanki-gpt";
  const maxCardsPerRequest = 50;

  if (cards.length > maxCardsPerRequest) {
    return NextResponse.json(
      {
        error: "Too many cards in one request.",
        nextStep: `Keep each GPT write under ${maxCardsPerRequest} cards.`,
      },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const inserted = await insertDeckCardsDirect({
      userId: access.userId,
      deckSyncId: access.deckSyncId,
      cards: cards.map((card) => ({
        front: card.front,
        back: card.back,
        notes: card.notes,
        tags: card.tags,
        source: requestedBy,
      })),
    });

    return NextResponse.json(
      {
        accepted: true,
        message: "Cards saved to the deck.",
        deckSyncId: access.deckSyncId,
        receivedCards: cards.length,
        insertedCount: inserted.length,
        inserted,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to save GPT cards.",
        nextStep: "Please try again later.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
