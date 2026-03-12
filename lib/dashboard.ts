import { isStorageConfigured } from "@/lib/object-storage";
import { createClient } from "@/lib/supabase/server";

type SyncRow = {
  id: number;
  deck_id: string;
  deck_name: string;
  card_count: number | null;
  s3_key: string | null;
  last_synced_at: string | null;
  checksum: string | null;
};

type StudyStatRow = {
  date: string;
  cards_reviewed: number | null;
  new_cards_studied: number | null;
  time_spent_seconds: number | null;
  retention_rate: number | null;
};

type ProfileRow = {
  email: string | null;
  display_name: string | null;
  created_at: string | null;
};

type QueryResult<T> = {
  data: T | null;
  missing: boolean;
  errorMessage?: string;
};

const MISSING_RELATION_CODES = new Set(["42P01", "PGRST106"]);

function normalizeQueryResult<T>(
  label: string,
  result: { data: T | null; error: { code?: string; message?: string } | null },
): QueryResult<T> {
  if (!result.error) {
    return { data: result.data, missing: false };
  }

  if (result.error.code && MISSING_RELATION_CODES.has(result.error.code)) {
    return { data: null, missing: true, errorMessage: `${label} table is not available yet.` };
  }

  return {
    data: null,
    missing: false,
    errorMessage: result.error.message || `Failed to load ${label}.`,
  };
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

export async function getAccountDashboardData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null };
  }

  const [profileResult, syncResult, statsResult] = await Promise.all([
    supabase.from("profiles").select("email, display_name, created_at").eq("id", user.id).maybeSingle(),
    supabase
      .from("deck_sync")
      .select("id, deck_id, deck_name, card_count, s3_key, last_synced_at, checksum")
      .order("last_synced_at", { ascending: false })
      .limit(12),
    supabase
      .from("study_stats")
      .select("date, cards_reviewed, new_cards_studied, time_spent_seconds, retention_rate")
      .order("date", { ascending: false })
      .limit(14),
  ]);

  const profile = normalizeQueryResult<ProfileRow>("profiles", profileResult);
  const sync = normalizeQueryResult<SyncRow[]>("deck_sync", syncResult);
  const stats = normalizeQueryResult<StudyStatRow[]>("study_stats", statsResult);

  const syncItems = sync.data ?? [];
  const recentStats = stats.data ?? [];
  const latestStat = recentStats[0] ?? null;

  const retentionValues = recentStats
    .map((item) => item.retention_rate)
    .filter((value): value is number => value != null);

  const summary = {
    syncedDecks: syncItems.length,
    totalCardsTracked: sum(syncItems.map((item) => item.card_count)),
    cardsReviewedLast14Days: sum(recentStats.map((item) => item.cards_reviewed)),
    studyMinutesLast14Days: Math.round(sum(recentStats.map((item) => item.time_spent_seconds)) / 60),
    averageRetention: retentionValues.length
      ? Math.round(retentionValues.reduce((total, value) => total + value, 0) / retentionValues.length)
      : null,
  };

  return {
    user,
    profile: profile.data,
    syncItems,
    recentStats,
    latestStat,
    summary,
    integrations: {
      profileReady: !profile.missing,
      syncReady: !sync.missing,
      statsReady: !stats.missing,
      storageDownloadReady: isStorageConfigured(),
      notes: [profile.errorMessage, sync.errorMessage, stats.errorMessage].filter(Boolean),
    },
  };
}
