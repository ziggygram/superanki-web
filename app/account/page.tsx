import type { ComponentType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  HardDrive,
  Shield,
  UserRound,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { getAccountDashboardData } from "@/lib/dashboard";

function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Not available yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: options?.timeStyle,
    ...options,
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

function formatMinutes(value: number | null | undefined) {
  if (!value) return "0 min";
  if (value >= 60) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${value} min`;
}

function formatRetention(value: number | null | undefined) {
  if (value == null) return "No data yet";
  return `${value}%`;
}

export default async function AccountPage() {
  const dashboard = await getAccountDashboardData();

  if (!dashboard.user) {
    redirect("/auth");
  }

  const { user, profile, syncItems, recentStats, latestStat, summary, integrations } = dashboard;
  const displayName = profile?.display_name || user.email?.split("@")[0] || "SuperAnki user";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl shadow-indigo-950/20 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">Account dashboard</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Welcome back, {displayName}.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Your secure web account is now the home for cloud sync status, backup visibility, and the first server-side slice of the SuperAnki dashboard.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{user.email}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  Joined {formatDate(profile?.created_at, { timeStyle: undefined })}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 hover:bg-white/10"
              >
                Back to homepage
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Cloud}
            label="Synced decks"
            value={String(summary.syncedDecks)}
            detail={summary.syncedDecks ? "Live from deck_sync" : "No cloud backup records yet"}
          />
          <MetricCard
            icon={Database}
            label="Cards tracked"
            value={summary.totalCardsTracked.toLocaleString("en-US")}
            detail={summary.totalCardsTracked ? "Across synced decks" : "Will populate after first sync"}
          />
          <MetricCard
            icon={Activity}
            label="Reviews, 14 days"
            value={summary.cardsReviewedLast14Days.toLocaleString("en-US")}
            detail={recentStats.length ? "Pulled from study_stats" : "No study_stats rows yet"}
          />
          <MetricCard
            icon={Shield}
            label="Average retention"
            value={formatRetention(summary.averageRetention)}
            detail={summary.averageRetention != null ? "Recent study performance" : "Waiting for synced stats"}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Sync and backups</p>
                <h2 className="mt-2 text-2xl font-bold">Cloud deck backups</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  This section reads your synced deck metadata server-side using the current authenticated Supabase session. If your iOS app has already written backup rows, they appear here immediately.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                {syncItems.length ? `${syncItems.length} backup item${syncItems.length === 1 ? "" : "s"}` : "No backup rows yet"}
              </div>
            </div>

            {syncItems.length ? (
              <div className="mt-6 space-y-4">
                {syncItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 transition hover:border-indigo-400/30"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{item.deck_name}</h3>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                            {formatRelativeDays(item.last_synced_at)}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <p className="text-slate-500">Deck ID</p>
                            <p className="mt-1 break-all font-medium text-slate-200">{item.deck_id}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <p className="text-slate-500">Cards</p>
                            <p className="mt-1 font-medium text-slate-200">{(item.card_count ?? 0).toLocaleString("en-US")}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <p className="text-slate-500">Last synced</p>
                            <p className="mt-1 font-medium text-slate-200">{formatDate(item.last_synced_at, { timeStyle: "short" })}</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-slate-400">
                          <p>
                            <span className="text-slate-500">Storage key:</span>{" "}
                            <span className="break-all text-slate-300">{item.s3_key ?? "Not written yet"}</span>
                          </p>
                          <p>
                            <span className="text-slate-500">Checksum:</span>{" "}
                            <span className="break-all text-slate-300">{item.checksum ?? "Not available yet"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:w-52">
                        <a
                          href={`/api/account/backups/${item.id}/download`}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            item.s3_key
                              ? "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                              : "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500 pointer-events-none"
                          }`}
                        >
                          <Download className="h-4 w-4" />
                          Request backup
                        </a>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-400">
                          Downloads are gated through a server route so object storage access can stay private.
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyStateCard
                icon={CloudOff}
                title="No cloud backup records yet"
                description="We did not find any deck_sync rows for this account. As soon as the iOS app writes sync metadata, this dashboard will show each deck, card counts, timestamps, and storage keys from the server."
              />
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Study snapshot</p>
              <h2 className="mt-2 text-2xl font-bold">Recent activity</h2>
              {latestStat ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-sm text-slate-500">Latest synced day</p>
                    <p className="mt-1 text-lg font-semibold">{formatDate(latestStat.date, { timeStyle: undefined })}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <MiniStat label="Cards reviewed" value={(latestStat.cards_reviewed ?? 0).toLocaleString("en-US")} />
                    <MiniStat label="New cards" value={(latestStat.new_cards_studied ?? 0).toLocaleString("en-US")} />
                    <MiniStat label="Study time" value={formatMinutes(Math.round((latestStat.time_spent_seconds ?? 0) / 60))} />
                    <MiniStat label="Retention" value={formatRetention(latestStat.retention_rate)} />
                  </div>
                </div>
              ) : (
                <EmptyStateCard
                  icon={Calendar}
                  title="No study stats yet"
                  description="The dashboard is ready for synced daily review totals, but no study_stats rows are available for this account yet."
                />
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Integration status</p>
              <h2 className="mt-2 text-2xl font-bold">What is live now</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <StatusRow label="Authenticated server session" ok />
                <StatusRow label="Profile query" ok={integrations.profileReady} />
                <StatusRow label="deck_sync query" ok={integrations.syncReady} />
                <StatusRow label="study_stats query" ok={integrations.statsReady} />
                <StatusRow label="Private backup download signing" ok={integrations.storageDownloadReady} />
              </div>

              {integrations.notes.length || !integrations.storageDownloadReady ? (
                <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  <p className="font-semibold text-amber-200">Setup notes</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {integrations.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                    {!integrations.storageDownloadReady ? (
                      <li>
                        Set <code className="rounded bg-black/20 px-1 py-0.5">SUPERANKI_STORAGE_SIGNING_KEY</code> and finish the signing implementation in the download route to enable one-click private backup downloads.
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Account details</p>
              <h2 className="mt-2 text-2xl font-bold">Identity and security</h2>
              <div className="mt-5 space-y-3">
                <InfoRow icon={UserRound} label="Email" value={user.email ?? "Unknown"} />
                <InfoRow icon={HardDrive} label="User ID" value={user.id} mono />
                <InfoRow icon={CheckCircle2} label="Auth provider" value="Supabase magic link" />
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-3xl border border-indigo-400/20 bg-indigo-400/10 p-6 text-sm leading-6 text-indigo-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-indigo-200">Next backend hookup</p>
              <p className="mt-1 text-indigo-100/90">
                Point the iOS sync pipeline at the <code className="rounded bg-black/20 px-1 py-0.5">deck_sync</code> and <code className="rounded bg-black/20 px-1 py-0.5">study_stats</code> tables, then finish private object-storage URL signing inside the download route.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-indigo-200">
              <ArrowUpRight className="h-4 w-4" />
              First slice shipped cleanly
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
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
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

function EmptyStateCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center">
      <div className="mx-auto inline-flex rounded-2xl bg-white/5 p-3 text-slate-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      <span>{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          ok ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"
        }`}
      >
        {ok ? "Ready" : "Needs wiring"}
      </span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="rounded-xl bg-white/5 p-2 text-slate-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`mt-1 break-all text-sm text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
