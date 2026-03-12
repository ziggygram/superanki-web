import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return NextResponse.json(
    {
      openapi: "3.1.0",
      info: {
        title: "SuperAnki GPT Deck Actions",
        version: "1.0.0",
        description:
          "Deck-scoped action for adding study cards to a SuperAnki deck. Generate a short-lived deck token from the logged-in deck workspace before using this schema in a GPT or agent.",
      },
      servers: [{ url: origin }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "SuperAnki deck token",
          },
        },
        schemas: {
          CardInput: {
            type: "object",
            additionalProperties: false,
            required: ["front", "back"],
            properties: {
              front: { type: "string", description: "Front side of the flashcard." },
              back: { type: "string", description: "Back side of the flashcard." },
              notes: { type: "string", description: "Optional source notes or context." },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Optional tags to attach to the generated card.",
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
      paths: {
        "/api/gpt/decks/{deckId}/cards": {
          post: {
            operationId: "addCardsToDeck",
            summary: "Add validated cards to a deck-scoped SuperAnki action endpoint",
            parameters: [
              {
                name: "deckId",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "The deck_sync row id for the target deck.",
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["cards"],
                    properties: {
                      source: {
                        type: "string",
                        description: "Optional source label, like custom-gpt or claude-desktop.",
                      },
                      cards: {
                        type: "array",
                        minItems: 1,
                        items: { $ref: "#/components/schemas/CardInput" },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "202": {
                description: "Cards were accepted and forwarded to the trusted backend.",
              },
              "401": { description: "Missing or invalid deck token." },
              "403": { description: "The token does not match the requested deck." },
              "413": { description: "Too many cards in one request." },
              "422": { description: "A card is missing required fields." },
              "501": {
                description: "The secure forwarding backend has not been configured yet.",
              },
            },
          },
        },
      },
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
