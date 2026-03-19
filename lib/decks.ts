import { isImportConfigured } from "@/lib/imports";
import { type ImportJobRow, formatImportJobStatus } from "@/lib/import-jobs";
import { isStorageConfigured } from "@/lib/object-storage";
import { createClient } from "@/lib/supabase/server";

export type SyncRow = {
  id: number;
  deck_id: string;
  deck_name: string;
  card_count: number | null;
  s3_key: string | null;
  last_synced_at: string | null;
  checksum: string | null;
};

export type StudyStatRow = {
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

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

async function getBaseAccountData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null as null };
  }

  const [profileResult, syncResult, syncDecksResult, statsResult, importJobsResult] = await Promise.all([
    supabase.from("profiles").select("email, display_name, created_at").eq("id", user.id).maybeSingle(),
    supabase
      .from("deck_sync")
      .select("id, deck_id, deck_name, card_count, s3_key, last_synced_at, checksum")
      .order("last_synced_at", { ascending: false })
      .limit(100),
    supabase
      .from("sync_decks")
      .select("id, name, color_hex, position, folder_id, usn, created_at, updated_at, is_deleted")
      .eq("is_deleted", false)
      .order("position", { ascending: true })
      .limit(100),
    supabase
      .from("study_stats")
      .select("date, cards_reviewed, new_cards_studied, time_spent_seconds, retention_rate")
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("import_jobs")
      .select(
        "id, user_id, deck_sync_id, source_filename, file_size_bytes, file_content_type, source_extension, status, worker_job_id, worker_status, error_message, created_at, updated_at, completed_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = normalizeQueryResult<ProfileRow>("profiles", profileResult);
  const sync = normalizeQueryResult<SyncRow[]>("deck_sync", syncResult);
  const syncDecks = syncDecksResult.data ?? [];
  const stats = normalizeQueryResult<StudyStatRow[]>("study_stats", statsResult);
  const importJobs = normalizeQueryResult<ImportJobRow[]>("import_jobs", importJobsResult);

  // Merge: deck_sync (legacy backup table) + sync_decks (real sync table from iOS)
  const legacyItems = sync.data ?? [];
  const legacyDeckIds = new Set(legacyItems.map((item) => item.deck_id));

  // Add sync_decks that aren't already in deck_sync
  const extraItems: SyncRow[] = syncDecks
    .filter((sd: { id: string }) => !legacyDeckIds.has(sd.id))
    .map((sd: { id: string; name: string; updated_at: string }) => ({
      id: 0, // no legacy ID
      deck_id: sd.id,
      deck_name: sd.name,
      card_count: null, // will be populated below
      s3_key: null,
      last_synced_at: sd.updated_at,
      checksum: null,
    }));

  const syncItems = [...legacyItems, ...extraItems];

  // Populate card counts from sync_cards for items without counts
  if (syncItems.some((item) => item.card_count == null)) {
    const deckIds = syncItems.filter((item) => item.card_count == null).map((item) => item.deck_id);
    const { data: cardCounts } = await supabase
      .from("sync_cards")
      .select("deck_id")
      .eq("is_deleted", false)
      .in("deck_id", deckIds);
    if (cardCounts) {
      const countMap = new Map<string, number>();
      for (const row of cardCounts) {
        countMap.set(row.deck_id, (countMap.get(row.deck_id) ?? 0) + 1);
      }
      for (const item of syncItems) {
        if (item.card_count == null) {
          item.card_count = countMap.get(item.deck_id) ?? 0;
        }
      }
    }
  }
  const recentStats = stats.data ?? [];
  const recentImportJobs = importJobs.data ?? [];
  const latestStat = recentStats[0] ?? null;
  const retentionValues = recentStats
    .map((item) => item.retention_rate)
    .filter((value): value is number => value != null);

  const summary = {
    syncedDecks: syncItems.length,
    totalCardsTracked: sum(syncItems.map((item) => item.card_count)),
    cardsReviewedLast30Days: sum(recentStats.map((item) => item.cards_reviewed)),
    studyMinutesLast30Days: Math.round(sum(recentStats.map((item) => item.time_spent_seconds)) / 60),
    averageRetention: retentionValues.length
      ? Math.round(retentionValues.reduce((total, value) => total + value, 0) / retentionValues.length)
      : null,
    restoreReadyDecks: syncItems.filter((item) => Boolean(item.s3_key)).length,
    importJobsTotal: recentImportJobs.length,
    importJobsInFlight: recentImportJobs.filter((item) => item.status === "pending" || item.status === "queued" || item.status === "processing").length,
    importJobsFailed: recentImportJobs.filter((item) => item.status === "failed").length,
  };

  return {
    user,
    profile: profile.data,
    syncItems,
    recentStats,
    recentImportJobs,
    latestStat,
    summary,
    integrations: {
      profileReady: !profile.missing,
      syncReady: !sync.missing,
      statsReady: !stats.missing,
      importJobsReady: !importJobs.missing,
      storageDownloadReady: isStorageConfigured(),
      importConfigured: isImportConfigured(),
      notes: [profile.errorMessage, sync.errorMessage, stats.errorMessage, importJobs.errorMessage].filter(Boolean),
    },
  };
}

export async function getAccountDashboardData() {
  return getBaseAccountData();
}

export async function getDeckWorkspaceData() {
  const base = await getBaseAccountData();

  if (!base.user) {
    return base;
  }

  const displayName = base.profile?.display_name || base.user.email?.split("@")[0] || "SuperAnki user";
  const freshestDeck = [...base.syncItems]
    .sort((left, right) => {
      const leftTime = left.last_synced_at ? new Date(left.last_synced_at).getTime() : 0;
      const rightTime = right.last_synced_at ? new Date(right.last_synced_at).getTime() : 0;
      return rightTime - leftTime;
    })[0] ?? null;

  return {
    ...base,
    displayName,
    freshestDeck,
  };
}

export async function getDeckDetailData(deckId: string) {
  const base = await getBaseAccountData();

  if (!base.user) {
    return { ...base, deck: null };
  }

  const deck = base.syncItems.find((item) => String(item.id) === deckId) ?? null;
  const peerDecks = base.syncItems.filter((item) => String(item.id) !== deckId).slice(0, 4);
  const deckImportJobs = deck
    ? base.recentImportJobs.filter((job) => job.deck_sync_id === deck.id)
    : [];

  return {
    ...base,
    deck,
    deckImportJobs,
    peerDecks,
  };
}

export function getImportJobTone(status: ImportJobRow["status"]) {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
    case "cancelled":
      return "error";
    default:
      return "warning";
  }
}

export function getImportJobSummary(job: ImportJobRow, syncItems: SyncRow[]) {
  const deck = job.deck_sync_id ? syncItems.find((item) => item.id === job.deck_sync_id) : null;

  return {
    ...job,
    deckName: deck?.deck_name ?? null,
    statusLabel: formatImportJobStatus(job.status),
  };
}
