import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Cloud, CloudOff, Database, Download, Layers3, Shield, Upload } from "lucide-react";
import { DeckManagementPanel } from "@/components/deck-management-panel";
import { formatImportLimit, getImportConfig } from "@/lib/imports";
import { getDeckWorkspaceData } from "@/lib/decks";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not synced yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeDays(value: string | null | undefined) {
  if (!value) return "Waiting for first sync";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return "Synced today";
  if (diffDays === 1) return "Synced yesterday";
  return `Synced ${diffDays} days ago`;
}

function formatRetention(value: number | null | undefined) {
  if (value == null) return "No retention data";
  return `${value}%`;
}

export default async function DecksPage() {
  const workspace = await getDeckWorkspaceData();

  if (!workspace.user) {
    redirect("/auth?next=/decks");
  }

  const importConfig = getImportConfig();
  const importBlockedReason = workspace.integrations.importConfigured
    ? null
    : "Set SUPERANKI_IMPORT_API_URL and SUPERANKI_IMPORT_API_TOKEN to hand browser uploads to a trusted import worker. Until then, the UI stays explicit and blocked.";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl shadow-indigo-950/20 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">Deck workspace</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Decks, backups, and import handoff.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                This is the first real deck-centric web slice. It lists synced decks, exposes backup restore readiness, and adds authenticated import/restore entry points without papering over backend gaps.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{workspace.displayName}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {workspace.summary.syncedDecks} synced deck{workspace.summary.syncedDecks === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {workspace.summary.restoreReadyDecks} restore-ready backup{workspace.summary.restoreReadyDecks === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/account"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 hover:bg-white/10"
              >
                Back to account
              </Link>
              {workspace.freshestDeck ? (
                <Link
                  href={`/decks/${workspace.freshestDeck.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
                >
                  Open latest deck
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Layers3}
            label="Synced decks"
            value={String(workspace.summary.syncedDecks)}
            detail={workspace.summary.syncedDecks ? "Live from deck_sync" : "No deck backups found yet"}
          />
          <MetricCard
            icon={Database}
            label="Cards tracked"
            value={workspace.summary.totalCardsTracked.toLocaleString("en-US")}
            detail="Summed from synced deck metadata"
          />
          <MetricCard
            icon={Shield}
            label="Average retention"
            value={formatRetention(workspace.summary.averageRetention)}
            detail="Rolled up from study_stats"
          />
          <MetricCard
            icon={Cloud}
            label="Study minutes, 30 days"
            value={workspace.summary.studyMinutesLast30Days.toLocaleString("en-US")}
            detail="Global account activity for now"
          />
        </section>

        <DeckManagementPanel
          importBlockedReason={importBlockedReason}
          restoreBlockedReason="Choose a deck detail page first. Restore preparation is tied to a specific signed backup object."
        />

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Deck listing</p>
              <h2 className="mt-2 text-2xl font-bold">Your synced decks</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Each record is a server-side view of the current `deck_sync` row. Detail pages expose the secure restore handoff and the exact blockers for missing storage or backup metadata.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              {importConfig ? `Web import limit ${formatImportLimit(importConfig.maxBytes)}` : "Web import worker not configured"}
            </div>
          </div>

          {workspace.syncItems.length ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {workspace.syncItems.map((deck) => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  className="group rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:border-indigo-400/30 hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="truncate text-xl font-semibold text-white">{deck.deck_name}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            deck.s3_key
                              ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                              : "border border-amber-400/20 bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {deck.s3_key ? "Restore-ready" : "Backup incomplete"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{formatRelativeDays(deck.last_synced_at)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:text-indigo-300" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Cards" value={(deck.card_count ?? 0).toLocaleString("en-US")} />
                    <MiniStat label="Backup" value={deck.s3_key ? "Signed URL available" : "Blocked"} />
                    <MiniStat label="Last sync" value={formatDate(deck.last_synced_at)} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                      Deck ID {deck.deck_id}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                      Backup row {deck.id}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center">
              <div className="mx-auto inline-flex rounded-2xl bg-white/5 p-3 text-slate-300">
                <CloudOff className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">No synced decks yet</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                We did not find any `deck_sync` rows for this account. As soon as a client pushes deck metadata, this page becomes the inventory view for backups and per-deck restore management.
              </p>
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <StatusCard
            icon={Download}
            title="Restore handoff"
            description={
              workspace.integrations.storageDownloadReady
                ? "Authenticated deck restore manifests can be prepared server-side."
                : "Set storage signing env vars before one-click restore handoff can work."
            }
          />
          <StatusCard
            icon={Upload}
            title="Import handoff"
            description={
              workspace.integrations.importConfigured
                ? "Browser uploads can be forwarded to the configured import worker."
                : "Import buttons stay blocked until a trusted import API is configured."
            }
          />
          <StatusCard
            icon={Cloud}
            title="Current limitation"
            description="Per-deck study history is not in the schema yet, so detail pages currently show deck metadata plus account-level study stats."
          />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
  detail: string;
}) {
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Layers3;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
      <div className="rounded-2xl bg-white/5 p-3 text-slate-200">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
