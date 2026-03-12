import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Cloud, Download, FolderArchive, Shield, Upload } from "lucide-react";
import { DeckManagementPanel } from "@/components/deck-management-panel";
import { ImportJobHistory } from "@/components/import-job-history";
import { getDeckDetailData } from "@/lib/decks";

function formatDate(value: string | null | undefined, withTime = true) {
  if (!value) return "Not available yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: withTime ? "short" : undefined,
  }).format(new Date(value));
}

function formatRetention(value: number | null | undefined) {
  if (value == null) return "No data yet";
  return `${value}%`;
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const detail = await getDeckDetailData(deckId);

  if (!detail.user) {
    redirect(`/auth?next=/decks/${deckId}`);
  }

  if (!detail.deck) {
    notFound();
  }

  const restoreBlockedReason = !detail.deck.s3_key
    ? "This deck has metadata in deck_sync, but no object-storage key yet. The upload client needs to write deck_sync.s3_key before restore can be prepared."
    : !detail.integrations.storageDownloadReady
      ? "Storage signing is not configured on the web app yet. Set SUPERANKI_STORAGE_ENDPOINT, SUPERANKI_STORAGE_BUCKET, SUPERANKI_STORAGE_REGION, SUPERANKI_STORAGE_ACCESS_KEY_ID, and SUPERANKI_STORAGE_SECRET_ACCESS_KEY."
      : null;

  const importBlockedReason = detail.integrations.importConfigured
    ? null
    : "Set SUPERANKI_IMPORT_API_URL and SUPERANKI_IMPORT_API_TOKEN to forward browser uploads to a trusted import worker.";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl shadow-indigo-950/20 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Link href="/decks" className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200">
                <ArrowLeft className="h-4 w-4" />
                Back to deck workspace
              </Link>
              <p className="mt-5 text-sm uppercase tracking-[0.24em] text-indigo-300">Deck detail</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{detail.deck.deck_name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                This is now the per-deck operational view for backup status, secure restore preparation, and linked import job history. It stays explicit about what is live versus what still depends on backend work.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  Backup row {detail.deck.id}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  Deck ID {detail.deck.deck_id}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {detail.deck.card_count ?? 0} cards tracked
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Backup readiness</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {detail.deck.s3_key && detail.integrations.storageDownloadReady ? "Ready" : "Blocked"}
              </p>
              <p className="mt-2 leading-6">
                {detail.deck.s3_key
                  ? "This deck has a storage key and can be handed off once server-side signing is configured."
                  : "The deck row exists, but the storage object key has not been synced yet."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={FolderArchive} label="Cards tracked" value={(detail.deck.card_count ?? 0).toLocaleString("en-US")} />
          <MetricCard icon={Cloud} label="Last synced" value={formatDate(detail.deck.last_synced_at)} />
          <MetricCard icon={Shield} label="Average retention" value={formatRetention(detail.summary.averageRetention)} />
          <MetricCard icon={Download} label="Deck imports" value={detail.deckImportJobs.length.toLocaleString("en-US")} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Deck metadata</p>
            <h2 className="mt-2 text-2xl font-bold">What the server knows right now</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard label="Deck name" value={detail.deck.deck_name} />
              <InfoCard label="Internal deck ID" value={detail.deck.deck_id} mono />
              <InfoCard label="Last synced at" value={formatDate(detail.deck.last_synced_at)} />
              <InfoCard label="Checksum" value={detail.deck.checksum ?? "Not available yet"} mono />
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-400">
              <p className="font-semibold text-slate-200">Current schema limitation</p>
              <p className="mt-2">
                `study_stats` is account-level, not per-deck. Import job history is now deck-linked when requests start from this page, but actual imported deck contents still depend on the worker pipeline.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Account study context</p>
            <h2 className="mt-2 text-2xl font-bold">Latest synced activity</h2>
            <div className="mt-5 space-y-3">
              <ContextRow label="Latest study day" value={detail.latestStat ? formatDate(detail.latestStat.date, false) : "No study_stats rows yet"} />
              <ContextRow label="Reviews, 30 days" value={detail.summary.cardsReviewedLast30Days.toLocaleString("en-US")} />
              <ContextRow label="Study minutes, 30 days" value={detail.summary.studyMinutesLast30Days.toLocaleString("en-US")} />
              <ContextRow label="Average retention" value={formatRetention(detail.summary.averageRetention)} />
            </div>
          </div>
        </section>

        <DeckManagementPanel
          deckId={String(detail.deck.id)}
          deckName={detail.deck.deck_name}
          restoreBlockedReason={restoreBlockedReason}
          importBlockedReason={importBlockedReason}
        />

        <ImportJobHistory
          jobs={detail.deckImportJobs}
          syncItems={detail.syncItems}
          compact
          title={`Recent imports for ${detail.deck.deck_name}`}
          description={
            detail.integrations.importJobsReady
              ? "Jobs created from this deck page are linked back to the current deck_sync row. Worker callbacks can update queued, processing, completed, and failed states without depending on client memory."
              : "This page is ready to show deck-linked import jobs, but the import_jobs table migration has not been applied yet."
          }
          emptyTitle="No deck-linked import jobs yet"
          emptyDescription="Create an import from this page to bind the request to this deck row once the import_jobs schema is available."
        />

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Restore notes</p>
            <h2 className="mt-2 text-2xl font-bold">Blocked states are explicit</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
              <Bullet text="Restore preparation is authenticated and checks the deck row belongs to the current user before generating a signed URL." />
              <Bullet text="If the backup row lacks `s3_key`, the API returns a conflict instead of a broken link." />
              <Bullet text="If object-storage signing env vars are missing, the UI and API both surface the exact configuration gap." />
              <Bullet text="Browser import is treated as a handoff to a trusted worker, with durable job status stored server-side before the file leaves the request." />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Nearby decks</p>
            <h2 className="mt-2 text-2xl font-bold">Jump to another backup</h2>
            {detail.peerDecks.length ? (
              <div className="mt-5 space-y-3">
                {detail.peerDecks.map((deck) => (
                  <Link
                    key={deck.id}
                    href={`/decks/${deck.id}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 hover:border-indigo-400/30"
                  >
                    <span className="truncate">{deck.deck_name}</span>
                    <span className="text-slate-500">{formatDate(deck.last_synced_at, false)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-400">No other synced decks are available for this account yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-indigo-400/20 bg-indigo-400/10 p-6 text-sm leading-6 text-indigo-100">
          <div className="flex items-start gap-3">
            <Upload className="mt-1 h-4 w-4 shrink-0 text-indigo-200" />
            <div>
              <p className="font-semibold text-indigo-200">Next backend hook worth building</p>
              <p className="mt-1 text-indigo-100/90">
                Teach the upstream import worker to post granular progress and imported deck metadata back into the callback route, then connect completed jobs to newly created deck rows automatically.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderArchive;
  label: string;
  value: string;
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
    </div>
  );
}

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 break-all text-sm text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      {text}
    </div>
  );
}
