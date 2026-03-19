/**
 * FSRS-5 Spaced Repetition Engine
 * TypeScript implementation matching the iOS SuperAnki app exactly.
 */

// FSRS-5 default weights (from iOS app)
const w = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589, 1.5747,
  0.2824, 1.0199, 1.925, 0.1157, 0.0, 0.0, 0.86, 1.49, 0.0, 0.0,
];

const REQUEST_RETENTION = 0.9;
const MAXIMUM_INTERVAL = 36500;

export enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface Card {
  id: string;
  user_id: string;
  deck_id: string;
  front: string;
  back: string;
  tags: string[] | null;
  note_type: string | null;
  difficulty: number;
  stability: number;
  retrievability: number | null;
  state: State;
  due: string | null;
  last_review: string | null;
  lapses: number;
  reps: number;
  elapsed_days: number;
  scheduled_days: number;
}

export interface SchedulingResult {
  card: Partial<Card>;
  reviewLog: {
    rating: Rating;
    state: State;
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    last_elapsed_days: number;
    scheduled_days: number;
    review: string;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function initStability(rating: Rating): number {
  return Math.max(w[rating - 1], 0.1);
}

function initDifficulty(rating: Rating): number {
  return clamp(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1, 10);
}

/** Forgetting curve matching iOS: pow(1 + t/(9*s), -1) */
function forgettingCurve(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1.0 + elapsedDays / (9.0 * stability), -1.0);
}

/** nextDifficulty matching iOS: d + delta + meanReversion */
function nextDifficulty(d: number, rating: Rating): number {
  const deltaDifficulty = -w[6] * (rating - 3);
  const meanReversion = w[7] * (initDifficulty(Rating.Easy) - d);
  return clamp(d + deltaDifficulty + meanReversion, 1, 10);
}

function nextRecallStability(
  d: number,
  s: number,
  r: number,
  rating: Rating,
): number {
  const hardPenalty = rating === Rating.Hard ? (w[15] > 0 ? w[15] : 1.0) : 1.0;
  const easyBonus = rating === Rating.Easy ? (w[16] > 0 ? w[16] : 1.0) : 1.0;

  const newS =
    s *
    (1 +
      Math.exp(w[8]) *
        (11 - d) *
        Math.pow(s, -w[9]) *
        (Math.exp((1 - r) * w[10]) - 1) *
        hardPenalty *
        easyBonus);
  return Math.min(newS, MAXIMUM_INTERVAL);
}

function nextForgetStability(
  d: number,
  s: number,
  r: number,
): number {
  const newS =
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14]);
  return Math.max(Math.min(newS, s), 0.1);
}

/** nextInterval matching iOS exactly */
function nextInterval(stability: number, state: State, rating: Rating): number {
  switch (state) {
    case State.New:
      return 0;
    case State.Learning:
    case State.Relearning:
      if (rating === Rating.Again || rating === Rating.Hard) return 0;
      if (rating === Rating.Good) return 1;
      // Easy graduates with at least 2 days
      return Math.max(2, Math.round(stability));
    case State.Review: {
      const baseInterval = stability * 9.0 * (1.0 / REQUEST_RETENTION - 1.0);
      const clamped = Math.max(1.0, Math.min(baseInterval, MAXIMUM_INTERVAL));
      let interval = Math.round(clamped);

      // Enforce min spread matching iOS
      if (rating === Rating.Hard) {
        const hardCeiling = Math.round(clamped * w[15]);
        interval = Math.max(1, Math.min(interval, hardCeiling));
      } else if (rating === Rating.Easy) {
        const easyFloor = Math.ceil(clamped * w[16]);
        interval = Math.max(interval, easyFloor);
      }

      return interval;
    }
    default:
      return 0;
  }
}

/** State after rating, matching iOS stateAfterRating */
function stateAfterRating(rating: Rating, wasNew: boolean): State {
  switch (rating) {
    case Rating.Again:
      return wasNew ? State.Learning : State.Relearning;
    case Rating.Hard:
      return wasNew ? State.Learning : State.Review;
    case Rating.Good:
    case Rating.Easy:
      return State.Review;
  }
}

/** Format due label matching iOS exactly */
export function dueLabel(scheduledDays: number, state: State, rating?: Rating): string {
  // Learning/relearning: hardcoded labels matching iOS
  if (state === State.Learning || state === State.Relearning) {
    if (rating === Rating.Again) return "1m";
    if (rating === Rating.Hard) return "6m";
    if (rating === Rating.Good) return "10m";
    // Easy graduates - fall through to days-based
  }

  // Days-based intervals matching iOS intervalLabel/dueLabel
  const days = scheduledDays;
  if (days === 0) return "< 1d";
  if (days === 1) return "1d";
  if (days < 31) return `${days}d`;
  if (days < 365) {
    const months = days / 30.44;
    if (months < 2) {
      // Show weeks for 1-2 months range
      const weeks = Math.floor(days / 7);
      return `${weeks}w`;
    }
    const tenths = Math.floor(months * 10) % 10;
    if (tenths === 0) return `${Math.floor(months)}mo`;
    return `${months.toFixed(1)}mo`;
  }
  const years = days / 365.25;
  if (years < 2) {
    const months = Math.floor(days / 30.44);
    return `${months}mo`;
  }
  const tenths = Math.floor(years * 10) % 10;
  if (tenths === 0) return `${Math.floor(years)}y`;
  return `${years.toFixed(1)}y`;
}

export function schedule(
  card: Card,
  rating: Rating,
  now: Date = new Date(),
): SchedulingResult {
  const lastReview = card.last_review ? new Date(card.last_review) : now;
  const elapsedDays =
    card.state === State.New
      ? 0
      : Math.max(0, Math.floor((now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)));

  let newState: State;
  let newStability: number;
  let newDifficulty: number;
  let newLapses = card.lapses;
  let scheduledDays: number;

  const currentState = card.state as State;

  if (currentState === State.New) {
    // --- New card: matching iOS ---
    newDifficulty = initDifficulty(rating);
    newStability = initStability(rating);
    newState = stateAfterRating(rating, true);
  } else if (currentState === State.Learning || currentState === State.Relearning) {
    // --- Learning/Relearning: matching iOS ---
    // iOS does NOT update difficulty during learning/relearning
    newDifficulty = card.difficulty;
    newState = stateAfterRating(rating, false);

    // Apply w[15]/w[16] multipliers when graduating to review (matching iOS)
    if (newState === State.Review) {
      if (rating === Rating.Hard) {
        newStability = card.stability * w[15];
      } else if (rating === Rating.Easy) {
        newStability = card.stability * w[16];
      } else {
        newStability = card.stability;
      }
    } else {
      newStability = card.stability;
    }
  } else {
    // --- Review card: matching iOS ---
    const r = forgettingCurve(elapsedDays, card.stability);
    newDifficulty = nextDifficulty(card.difficulty, rating);

    if (rating === Rating.Again) {
      newStability = nextForgetStability(newDifficulty, card.stability, r);
      newState = State.Relearning;
    } else {
      newStability = nextRecallStability(newDifficulty, card.stability, r, rating);
      newState = State.Review;
    }
  }

  // Lapses: iOS increments on Again regardless of state
  if (rating === Rating.Again) {
    newLapses++;
  }

  // Compute interval using iOS logic
  scheduledDays = nextInterval(newStability, newState, rating);

  // Compute due date
  let dueDate: Date;
  if (newState === State.Learning || newState === State.Relearning) {
    // Learning/relearning: scheduledDays=0 means "now" (intra-day scheduling)
    // Use minute-based offsets for actual due time
    let minuteOffset = 1; // default
    if (rating === Rating.Again) minuteOffset = 1;
    else if (rating === Rating.Hard) minuteOffset = 6;
    else if (rating === Rating.Good) minuteOffset = 10;
    dueDate = new Date(now.getTime() + minuteOffset * 60 * 1000);
  } else {
    dueDate = new Date(now.getTime() + scheduledDays * 24 * 60 * 60 * 1000);
  }

  const retrievability =
    newState === State.Review
      ? forgettingCurve(scheduledDays, newStability)
      : null;

  return {
    card: {
      difficulty: newDifficulty,
      stability: newStability,
      state: newState,
      due: dueDate.toISOString(),
      last_review: now.toISOString(),
      lapses: newLapses,
      reps: card.reps + 1,
      elapsed_days: elapsedDays,
      scheduled_days: scheduledDays,
      retrievability,
    },
    reviewLog: {
      rating,
      state: card.state,
      due: dueDate.toISOString(),
      stability: newStability,
      difficulty: newDifficulty,
      elapsed_days: elapsedDays,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: scheduledDays,
      review: now.toISOString(),
    },
  };
}

/** Preview all four rating outcomes for button labels */
export function previewSchedule(
  card: Card,
  now: Date = new Date(),
): Record<Rating, { scheduledDays: number; state: State; rating: Rating }> {
  const results = {} as Record<Rating, { scheduledDays: number; state: State; rating: Rating }>;
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    const result = schedule(card, r, now);
    results[r] = {
      scheduledDays: result.card.scheduled_days!,
      state: result.card.state!,
      rating: r,
    };
  }
  return results;
}
