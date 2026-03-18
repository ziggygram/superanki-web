/**
 * Study session logic: fetch due cards, sort, apply limits, save results.
 */
import { createClient } from "@/lib/supabase/client";
import { Card, State, Rating, schedule } from "@/lib/fsrs";

export interface StudyConfig {
  newCardsPerDay: number;
  reviewCardsPerDay: number;
}

const DEFAULT_CONFIG: StudyConfig = {
  newCardsPerDay: 20,
  reviewCardsPerDay: 200,
};

export interface ReviewAction {
  card: Card;
  rating: Rating;
  timestamp: Date;
  result: ReturnType<typeof schedule>;
}

/**
 * Fetch due cards for a deck, sorted: learning/relearning first, then review, then new.
 */
export async function fetchDueCards(
  deckId: string,
  config: StudyConfig = DEFAULT_CONFIG,
): Promise<Card[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Fetch learning/relearning cards (always shown, no limit)
  const { data: learningCards } = await supabase
    .from("sync_cards")
    .select("*")
    .eq("deck_id", deckId)
    .in("state", [State.Learning, State.Relearning])
    .lte("due", now)
    .order("due", { ascending: true });

  // Fetch review cards
  const { data: reviewCards } = await supabase
    .from("sync_cards")
    .select("*")
    .eq("deck_id", deckId)
    .eq("state", State.Review)
    .lte("due", now)
    .order("due", { ascending: true })
    .limit(config.reviewCardsPerDay);

  // Fetch new cards
  const { data: newCards } = await supabase
    .from("sync_cards")
    .select("*")
    .eq("deck_id", deckId)
    .eq("state", State.New)
    .order("id", { ascending: true })
    .limit(config.newCardsPerDay);

  return [
    ...(learningCards ?? []),
    ...(reviewCards ?? []),
    ...(newCards ?? []),
  ] as Card[];
}

/**
 * Fetch due card counts per deck for the current user.
 */
export async function fetchDueCounts(
  userId: string,
): Promise<Record<string, { new: number; learning: number; review: number }>> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data: cards } = await supabase
    .from("sync_cards")
    .select("deck_id, state, due")
    .eq("user_id", userId);

  const counts: Record<string, { new: number; learning: number; review: number }> = {};

  for (const card of cards ?? []) {
    if (!counts[card.deck_id]) {
      counts[card.deck_id] = { new: 0, learning: 0, review: 0 };
    }
    if (card.state === State.New) {
      counts[card.deck_id].new++;
    } else if (
      (card.state === State.Learning || card.state === State.Relearning) &&
      card.due && card.due <= now
    ) {
      counts[card.deck_id].learning++;
    } else if (card.state === State.Review && card.due && card.due <= now) {
      counts[card.deck_id].review++;
    }
  }

  return counts;
}

/**
 * Batch save review results at end of session.
 */
export async function saveReviewResults(
  actions: ReviewAction[],
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (actions.length === 0) return { success: true };

  const supabase = createClient();

  // Update cards
  for (const action of actions) {
    const { error } = await supabase
      .from("sync_cards")
      .update({
        difficulty: action.result.card.difficulty,
        stability: action.result.card.stability,
        state: action.result.card.state,
        due: action.result.card.due,
        last_review: action.result.card.last_review,
        lapses: action.result.card.lapses,
        reps: action.result.card.reps,
        elapsed_days: action.result.card.elapsed_days,
        scheduled_days: action.result.card.scheduled_days,
        retrievability: action.result.card.retrievability,
      })
      .eq("id", action.card.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update card:", action.card.id, error);
      return { success: false, error: error.message };
    }
  }

  // Insert review logs
  const logs = actions.map((action) => ({
    card_id: action.card.id,
    user_id: userId,
    deck_id: action.card.deck_id,
    rating: action.rating,
    state: action.result.reviewLog.state,
    due: action.result.reviewLog.due,
    stability: action.result.reviewLog.stability,
    difficulty: action.result.reviewLog.difficulty,
    elapsed_days: action.result.reviewLog.elapsed_days,
    last_elapsed_days: action.result.reviewLog.last_elapsed_days,
    scheduled_days: action.result.reviewLog.scheduled_days,
    review: action.result.reviewLog.review,
  }));

  const { error: logError } = await supabase.from("review_logs").insert(logs);

  if (logError) {
    console.error("Failed to insert review logs:", logError);
    // Non-fatal: cards were already updated
  }

  return { success: true };
}
