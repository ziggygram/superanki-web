import type { ComponentType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Calendar,
  Cloud,
  CloudOff,
  Database,
  Download,
  Shield,
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
                href="/study"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
              >
                Study now
              </Link>
              <Link
                href="/decks"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 hover:bg-white/10"
              >
                Open deck workspace
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 hover:bg-white/10"
              >
                Back to homepage
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 hover:bg-white/10"
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
            detail={summary.syncedDecks ? "Backed up and ready to browse" : "No cloud backup records yet"}
          />
          <MetricCard
            icon={Database}
            label="Cards tracked"
            value={summary.totalCardsTracked.toLocaleString("en-US")}
            detail={summary.totalCardsTracked ? "Across synced decks" : "Will populate after first sync"}
          />
          <MetricCard
            icon={Activity}
            label="Reviews, 30 days"
            value={summary.cardsReviewedLast30Days.toLocaleString("en-US")}
            detail={recentStats.length ? "Recent study activity" : "No recent study activity yet"}
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
                  Browse your latest synced decks, backup availability, and recent study progress in one place.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                {syncItems.length ? `${syncItems.length} backup${syncItems.length === 1 ? "" : "s"}` : "No backups yet"}
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
                            <p className="text-slate-500">Cards</p>
                            <p className="mt-1 font-medium text-slate-200">{(item.card_count ?? 0).toLocaleString("en-US")}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <p className="text-slate-500">Last synced</p>
                            <p className="mt-1 font-medium text-slate-200">{formatDate(item.last_synced_at, { timeStyle: "short" })}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <p className="text-slate-500">Backup</p>
                            <p className="mt-1 font-medium text-slate-200">{item.s3_key ? "Available" : "Processing"}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-400">
                          {item.s3_key
                            ? "This backup is available to restore from a secure download link."
                            : "This deck is still syncing its latest backup and will appear here when ready."}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 lg:w-52">
                        <Link
                          href={`/decks/${item.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                          Open detail
                        </Link>
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
                          Downloads are delivered through a secure temporary link.
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
                description="Your synced decks will show up here as soon as your account finishes its first backup."
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
                  description="Your study activity will appear here after your first synced review session."
                />
              )}
            </section>


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


