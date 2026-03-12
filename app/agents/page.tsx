import Link from "next/link";
import { Bot, Cable, CheckCircle2, KeyRound, Shield, Sparkles, Workflow } from "lucide-react";
import { isGptForwardingConfigured, isGptTokenIssuanceReady } from "@/lib/gpt";

export const metadata = {
  title: "SuperAnki Agents",
  description: "Connect SuperAnki to MCP clients and GPT actions with deck-scoped auth and explicit backend requirements.",
};

const mcpFeatures = [
  "Public MCP documentation with clear auth expectations",
  "Deck-aware workflows instead of broad account access",
  "Short-lived GPT token flow from a logged-in deck workspace",
  "OpenAPI action schema for GPTs and other agent runtimes",
];

const steps = [
  {
    title: "Log in to SuperAnki",
    description: "Use your regular web account so deck ownership can be checked server-side.",
  },
  {
    title: "Open a deck workspace",
    description: "Generate a token from a specific deck. Tokens are scoped to that deck only and expire automatically.",
  },
  {
    title: "Connect your agent",
    description: "Use the OpenAPI schema for a GPT or wire the MCP docs into your desktop client. Requests stay constrained and auditable.",
  },
];

export default function AgentsPage() {
  const tokenReady = isGptTokenIssuanceReady();
  const forwardingReady = isGptForwardingConfigured();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl shadow-indigo-950/20 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">SuperAnki agents</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">MCP and GPT access for your decks, without exposing your whole account.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                This page documents the agent surface that exists today. The auth model is real, deck-scoped, and explicit about what still needs backend wiring before writes can land in production.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Public docs</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Logged-in token flow</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Deck-scoped auth</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/auth?next=/decks" className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">
                Sign in to connect
              </Link>
              <Link href="/" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 hover:bg-white/10">
                Back to homepage
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Cable} label="MCP docs" value="Live" detail="Published on this page for public discovery." />
          <StatCard icon={Bot} label="GPT schema" value="Live" detail="Available at /api/openapi/gpt for custom GPT actions." />
          <StatCard icon={KeyRound} label="Deck tokens" value={tokenReady ? "Ready" : "Blocked"} detail={tokenReady ? "Short-lived tokens can be minted server-side." : "Set SUPERANKI_GPT_SHARED_SECRET to issue deck tokens."} />
          <StatCard icon={Sparkles} label="Deck writes" value={forwardingReady ? "Ready" : "Scaffolded"} detail={forwardingReady ? "Validated card batches can be forwarded upstream." : "UI and validation are shipped, but backend forwarding is still off."} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-indigo-300">
              <Cable className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.2em]">MCP</p>
            </div>
            <h2 className="mt-3 text-2xl font-bold">Model Context Protocol access</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              SuperAnki&apos;s MCP surface is intended for trusted clients that need structured access to deck operations. The web slice ships the public contract and the same deck-scoped auth posture used by the GPT flow.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {mcpFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-white">Current scope</p>
              <p className="mt-2">
                The secure deck token flow and action schema are live now. If you want a richer MCP server, the next backend step is to map these validated deck-scoped requests onto the same trusted card-writing service used by GPT actions.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-indigo-300">
              <Workflow className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.2em]">How it works</p>
            </div>
            <h2 className="mt-3 text-2xl font-bold">Secure by default</h2>
            <div className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-indigo-300">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-indigo-300">
              <Bot className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.2em]">GPT</p>
            </div>
            <h2 className="mt-3 text-2xl font-bold">Custom GPT setup</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
              SuperAnki exposes a public OpenAPI schema for GPT actions at <code className="rounded bg-black/20 px-1 py-0.5">/api/openapi/gpt</code>. The GPT still needs a user-generated Bearer token from a logged-in deck page before it can act.
            </p>
            <div className="mt-6 space-y-3">
              <Instruction title="Schema URL" value="https://superanki.app/api/openapi/gpt" />
              <Instruction title="Auth type" value="Bearer token, generated from a logged-in deck page" />
              <Instruction title="Action path" value="POST /api/gpt/decks/{deckId}/cards" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-indigo-300">
              <Shield className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.2em]">Availability</p>
            </div>
            <h2 className="mt-3 text-2xl font-bold">What is live right now</h2>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <StatusRow label="Public /agents documentation" ok />
              <StatusRow label="OpenAPI schema for GPT actions" ok />
              <StatusRow label="Logged-in deck token generator" ok={tokenReady} />
              <StatusRow label="Trusted backend deck writer" ok={forwardingReady} />
            </div>
            {!tokenReady || !forwardingReady ? (
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                <p className="font-semibold text-amber-200">Required env vars</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {!tokenReady ? <li>Set <code className="rounded bg-black/20 px-1 py-0.5">SUPERANKI_GPT_SHARED_SECRET</code> for short-lived deck token issuance.</li> : null}
                  <li>Apply the latest Supabase migration so the <code className="rounded bg-black/20 px-1 py-0.5">deck_cards</code> table exists for direct GPT card writes.</li>
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Cable; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

function Instruction({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      <span>{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
        {ok ? "Ready" : "Needs wiring"}
      </span>
    </div>
  );
}
