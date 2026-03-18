import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Bot, ChevronLeft, Shield, Sparkles } from "lucide-react";
import { GptDeckPanel } from "@/components/gpt-deck-panel";
import { getDeckDetailData } from "@/lib/decks";
import { isGptForwardingConfigured, isGptTokenIssuanceReady } from "@/lib/gpt";

export default async function DeckGptPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  const detail = await getDeckDetailData(deckId);

  if (!detail.user) {
    redirect(`/auth?next=/decks/${deckId}/gpt`);
  }

  if (!detail.deck) {
    notFound();
  }

  const tokenReady = isGptTokenIssuanceReady();
  const forwardingReady = isGptForwardingConfigured();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl shadow-indigo-950/20 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Link href={`/decks/${detail.deck.id}`} className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200">
                <ChevronLeft className="h-4 w-4" />
                Back to deck detail
              </Link>
              <p className="mt-5 text-sm uppercase tracking-[0.24em] text-indigo-300">Deck GPT setup</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Connect agents to {detail.deck.deck_name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                This is the logged-in surface for GPT actions and other deck-scoped agents. Tokens created here are tied to one deck and expire automatically.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{detail.deck.card_count ?? 0} cards tracked</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <StatusTile icon={Shield} label="Deck token issuance" ok={tokenReady} />
              <StatusTile icon={Sparkles} label="Card write forwarding" ok={forwardingReady} />
            </div>
          </div>
        </section>

        <GptDeckPanel deckId={String(detail.deck.id)} deckName={detail.deck.deck_name} tokenReady={tokenReady} forwardingReady={forwardingReady} />

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-indigo-300">
              <Bot className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.2em]">Suggested GPT instructions</p>
            </div>
            <h2 className="mt-3 text-2xl font-bold">Keep the action narrow</h2>
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
              <pre className="overflow-x-auto whitespace-pre-wrap">{`Use the SuperAnki action only when the user explicitly asks to add flashcards.
Always send cards as concise front/back pairs.
Do not invent deck ids.
If the API cannot complete a request, explain the problem briefly and ask the user to try again later.`}</pre>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Current guarantees</p>
            <h2 className="mt-3 text-2xl font-bold">What this flow protects</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">Tokens are generated only from an authenticated web session.</li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">Each token is scoped to one deck, not your whole account.</li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">The action endpoint validates required card fields before any upstream handoff.</li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">If the backend writer is missing, requests fail explicitly instead of pretending cards were saved.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusTile({ icon: Icon, label, ok }: { icon: typeof Shield; label: string; ok: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white/5 p-2 text-slate-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className={`mt-1 text-sm font-semibold ${ok ? "text-emerald-300" : "text-amber-300"}`}>{ok ? "Available" : "Unavailable"}</p>
        </div>
      </div>
    </div>
  );
}
