import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { type ImportJobRow, formatImportJobStatus } from "@/lib/import-jobs";
import { type SyncRow } from "@/lib/decks";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
}

function getStatusMeta(status: ImportJobRow["status"]) {
  switch (status) {
    case "completed":
      return {
        icon: CheckCircle2,
        badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
      };
    case "failed":
    case "cancelled":
      return {
        icon: XCircle,
        badge: "border-rose-400/20 bg-rose-400/10 text-rose-300",
      };
    case "processing":
      return {
        icon: Clock3,
        badge: "border-indigo-400/20 bg-indigo-400/10 text-indigo-300",
      };
    default:
      return {
        icon: AlertCircle,
        badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
      };
  }
}

export function ImportJobHistory({
  jobs,
  syncItems,
  title,
  description,
  emptyTitle,
  emptyDescription,
  compact = false,
}: {
  jobs: ImportJobRow[];
  syncItems: SyncRow[];
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Import job history</p>
          <h2 className="mt-2 text-2xl font-bold">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">{description}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
          {jobs.length} recent job{jobs.length === 1 ? "" : "s"}
        </div>
      </div>

      {jobs.length ? (
        <div className={`mt-6 grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
          {jobs.map((job) => {
            const deck = job.deck_sync_id ? syncItems.find((item) => item.id === job.deck_sync_id) : null;
            const meta = getStatusMeta(job.status);
            const Icon = meta.icon;

            return (
              <article key={job.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="truncate text-lg font-semibold text-white">{job.source_filename}</h3>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${meta.badge}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {formatImportJobStatus(job.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      Created {formatDateTime(job.created_at)}
                      {job.completed_at ? `, finished ${formatDateTime(job.completed_at)}` : ""}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                    Job {job.id}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Package size" value={formatBytes(job.file_size_bytes)} />
                  <MiniStat label="Deck scope" value={deck ? deck.deck_name : "Account-wide"} />
                  <MiniStat label="Worker status" value={job.worker_status ?? "Waiting"} />
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  {job.deck_sync_id && deck ? (
                    <Link href={`/decks/${job.deck_sync_id}`} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 hover:border-indigo-400/30 hover:text-indigo-300">
                      Deck {deck.deck_name}
                    </Link>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">No deck linked</span>
                  )}
                  {job.worker_job_id ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Worker job {job.worker_job_id}</span>
                  ) : null}
                  {job.source_extension ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{job.source_extension}</span>
                  ) : null}
                </div>

                {job.error_message ? (
                  <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                    <p className="font-semibold">Failure detail</p>
                    <p className="mt-1">{job.error_message}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center">
          <div className="mx-auto inline-flex rounded-2xl bg-white/5 p-3 text-slate-300">
            <Clock3 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">{emptyTitle}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{emptyDescription}</p>
        </div>
      )}
    </section>
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
