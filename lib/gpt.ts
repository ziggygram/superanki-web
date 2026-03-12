import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60;
const DEFAULT_MAX_CARDS_PER_REQUEST = 50;

type GptDeckTokenPayload = {
  sub: string;
  email: string | null;
  deckSyncId: number;
  exp: number;
};

type GptForwardConfig = {
  apiUrl: string;
  apiToken: string;
  maxCardsPerRequest: number;
};

export type DirectDeckCardInsert = {
  front: string;
  back: string;
  notes: string | null;
  tags: string[];
  source: string;
};

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export function getGptSharedSecret() {
  return process.env.SUPERANKI_GPT_SHARED_SECRET || null;
}

export function getGptTokenTtlSeconds() {
  const ttl = Number(process.env.SUPERANKI_GPT_TOKEN_TTL_SECONDS ?? DEFAULT_TOKEN_TTL_SECONDS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TOKEN_TTL_SECONDS;
}

export function getGptForwardConfig(): GptForwardConfig | null {
  const apiUrl = process.env.SUPERANKI_GPT_API_URL;
  const apiToken = process.env.SUPERANKI_GPT_API_TOKEN;
  const maxCardsPerRequest = Number(process.env.SUPERANKI_GPT_MAX_CARDS_PER_REQUEST ?? DEFAULT_MAX_CARDS_PER_REQUEST);

  if (!apiUrl || !apiToken) {
    return null;
  }

  return {
    apiUrl,
    apiToken,
    maxCardsPerRequest: Number.isFinite(maxCardsPerRequest) && maxCardsPerRequest > 0 ? maxCardsPerRequest : DEFAULT_MAX_CARDS_PER_REQUEST,
  };
}

export function isGptTokenIssuanceReady() {
  return Boolean(getGptSharedSecret());
}

export function isGptForwardingConfigured() {
  return true;
}

export async function insertDeckCardsDirect(params: {
  userId: string;
  deckSyncId: number;
  cards: DirectDeckCardInsert[];
}) {
  const supabase = await createClient();
  const rows = params.cards.map((card) => ({
    user_id: params.userId,
    deck_sync_id: params.deckSyncId,
    front: card.front,
    back: card.back,
    notes: card.notes,
    tags: card.tags,
    source: card.source,
  }));

  const { data, error } = await supabase
    .from("deck_cards")
    .insert(rows)
    .select("id, front, back, source, created_at");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function signDeckAccessToken(payload: Omit<GptDeckTokenPayload, "exp"> & { exp?: number }) {
  const secret = getGptSharedSecret();

  if (!secret) {
    throw new Error("SUPERANKI_GPT_SHARED_SECRET is not configured.");
  }

  const normalizedPayload: GptDeckTokenPayload = {
    ...payload,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + getGptTokenTtlSeconds(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(normalizedPayload));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyDeckAccessToken(token: string) {
  const secret = getGptSharedSecret();

  if (!secret) {
    throw new Error("SUPERANKI_GPT_SHARED_SECRET is not configured.");
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Malformed token.");
  }

  const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error("Invalid token signature.");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as GptDeckTokenPayload;

  if (!payload.sub || !payload.deckSyncId || !payload.exp) {
    throw new Error("Token payload is incomplete.");
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired.");
  }

  return payload;
}

export async function resolveDeckAccessFromRequest(request: Request, deckId: string) {
  const supabase = await createClient();
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (bearerToken) {
    const payload = verifyDeckAccessToken(bearerToken);

    if (String(payload.deckSyncId) !== deckId) {
      throw new Error("Token does not match the requested deck.");
    }

    return {
      authMode: "token" as const,
      userId: payload.sub,
      email: payload.email,
      deckSyncId: payload.deckSyncId,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: deck, error } = await supabase
    .from("deck_sync")
    .select("id")
    .eq("id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !deck) {
    throw new Error("Deck not found.");
  }

  return {
    authMode: "session" as const,
    userId: user.id,
    email: user.email ?? null,
    deckSyncId: deck.id,
  };
}
