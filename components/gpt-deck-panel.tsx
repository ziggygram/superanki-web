"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, KeyRound, LoaderCircle, ShieldAlert } from "lucide-react";

type TokenState =
  | null
  | {
      tone: "success" | "warning" | "error";
      title: string;
      description: string;
      token?: string;
      actionUrl?: string;
      openApiUrl?: string;
      expiresInSeconds?: number;
    };

export function GptDeckPanel({ deckId, deckName, tokenReady, forwardingReady }: { deckId: string; deckName: string; tokenReady: boolean; forwardingReady: boolean }) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<TokenState>(null);
  const [copied, setCopied] = useState<"token" | "schema" | "action" | null>(null);

  const cta = useMemo(() => {
    if (forwardingReady) {
      return "Generate deck token";
    }

    return tokenReady ? "Generate preview token" : "Token generation blocked";
  }, [forwardingReady, tokenReady]);

  async function handleGenerateToken() {
    setLoading(true);
    setState(null);

    try {
      const response = await fetch("/api/gpt/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deckId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setState({
          tone: response.status >= 500 ? "warning" : "error",
          title: payload.error || "Could not generate GPT token",
          description: payload.nextStep || "Retry after checking the deck configuration.",
        });
        return;
      }

      setState({
        tone: forwardingReady ? "success" : "warning",
        title: forwardingReady ? "Deck token ready" : "Deck token ready, forwarding still blocked",
        description: forwardingReady
          ? payload.nextStep || "Use this as the Bearer token in your GPT action config."
          : "The deck token is real and scoped correctly, but writes will stay blocked until the GPT forwarding backend is configured.",
        token: payload.token,
        actionUrl: payload.actionUrl,
        openApiUrl: payload.openApiUrl,
        expiresInSeconds: payload.expiresInSeconds,
      });
    } catch {
      setState({
        tone: "error",
        title: "Network error",
        description: "The token request did not complete.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyValue(kind: "token" | "schema" | "action", value?: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1500);
  }

  const toneClasses = state?.tone === "success"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
    : state?.tone === "warning"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : "border-rose-400/20 bg-rose-400/10 text-rose-100";

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">GPT access</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Deck-scoped GPT handoff for {deckName}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
            Generate a short-lived Bearer token tied to this deck. That gives a custom GPT or agent access to exactly one destination deck instead of your whole account.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
          Logged-in only
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="1. Generate token"
          description="Issued from your authenticated session and scoped to this deck_sync row only."
        />
        <InfoCard
          title="2. Paste schema"
          description="Use the OpenAPI schema URL in the GPT builder or another agent runtime."
        />
        <InfoCard
          title="3. Add cards"
          description="The action endpoint validates the token, deck scope, and card payload before any write handoff."
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading || !tokenReady}
          onClick={handleGenerateToken}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
            tokenReady
              ? "bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-wait"
              : "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
          }`}
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {cta}
        </button>

        {!tokenReady ? (
          <span className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Set SUPERANKI_GPT_SHARED_SECRET to turn on token issuance.
          </span>
        ) : null}

        {!forwardingReady ? (
          <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            Writes stay blocked until SUPERANKI_GPT_API_URL and SUPERANKI_GPT_API_TOKEN are configured.
          </span>
        ) : null}
      </div>

      {state ? (
        <div className={`mt-6 rounded-3xl border p-5 ${toneClasses}`}>
          <div className="flex items-start gap-3">
            {state.tone === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{state.title}</p>
              <p className="mt-1 text-sm leading-6">{state.description}</p>
              {state.expiresInSeconds ? (
                <p className="mt-2 text-xs uppercase tracking-[0.18em] opacity-80">Expires in {Math.round(state.expiresInSeconds / 60)} minutes</p>
              ) : null}

              {state.token ? (
                <CodeRow label="Bearer token" value={state.token} onCopy={() => copyValue("token", state.token)} copied={copied === "token"} />
              ) : null}
              {state.openApiUrl ? (
                <CodeRow label="OpenAPI schema" value={state.openApiUrl} onCopy={() => copyValue("schema", state.openApiUrl)} copied={copied === "schema"} />
              ) : null}
              {state.actionUrl ? (
                <CodeRow label="Action endpoint" value={state.actionUrl} onCopy={() => copyValue("action", state.actionUrl)} copied={copied === "action"} />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function CodeRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="mt-4 rounded-2xl border border-current/20 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] opacity-80">{label}</p>
        <button type="button" onClick={onCopy} className="inline-flex items-center gap-2 rounded-xl border border-current/20 px-3 py-2 text-xs font-semibold">
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6">{value}</pre>
    </div>
  );
}
