/**
 * FSRS-5 Spaced Repetition Engine
 * TypeScript implementation matching the iOS SuperAnki app parameters.
 */

// FSRS-5 default weights (from iOS app)
const w = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589, 1.5747,
  0.2824, 1.0199, 1.925, 0.1157, 0.0, 0.0, 0.86, 1.49, 0.0, 0.0,
];

const REQUEST_RETENTION = 0.9;
const DECAY = -0.5;
const FACTOR = 19 / 81; // 0.9^(1/DECAY) - 1

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

function forgettingCurve(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function nextDifficulty(d: number, rating: Rating): number {
  const nextD = d - w[6] * (rating - 3);
  // Mean reversion
  return clamp(w[7] * initDifficulty(Rating.Easy) + (1 - w[7]) * nextD, 1, 10);
}

function nextRecallStability(
  d: number,
  s: number,
  r: number,
  rating: Rating,
): number {
  const hardPenalty = rating === Rating.Hard ? w[15] : 1;
  const easyBonus = rating === Rating.Easy ? w[16] : 1;
  return (
    s *
    (1 +
      Math.exp(w[8]) *
        (11 - d) *
        Math.pow(s, -w[9]) *
        (Math.exp((1 - r) * w[10]) - 1) *
        hardPenalty *
        easyBonus)
  );
}

function nextForgetStability(
  d: number,
  s: number,
  r: number,
): number {
  return (
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14])
  );
}

function nextInterval(stability: number): number {
  return Math.max(
    1,
    Math.round((stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1)),
  );
}

/** Format an interval in days to a human-readable label matching iOS */
export function dueLabel(intervalDays: number, state: State): string {
  if (state === State.Learning || state === State.Relearning) {
    // Learning intervals are in minutes
    const mins = intervalDays * 24 * 60;
    if (mins < 60) return `${Math.round(mins)}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h`;
    return `${Math.round(mins / 1440)}d`;
  }
  if (intervalDays < 1) {
    return `${Math.round(intervalDays * 24 * 60)}m`;
  }
  if (intervalDays < 30) return `${Math.round(intervalDays)}d`;
  if (intervalDays < 365) {
    const months = intervalDays / 30;
    return months < 10
      ? `${months.toFixed(1)}mo`
      : `${Math.round(months)}mo`;
  }
  const years = intervalDays / 365;
  return years < 10 ? `${years.toFixed(1)}y` : `${Math.round(years)}y`;
}

// Learning step intervals in minutes
const LEARNING_STEPS = [1, 10]; // Again=1min, Good=10min
const RELEARNING_STEPS = [10]; // Again=10min

export function schedule(
  card: Card,
  rating: Rating,
  now: Date = new Date(),
): SchedulingResult {
  const lastReview = card.last_review ? new Date(card.last_review) : now;
  const elapsedDays =
    card.state === State.New
      ? 0
      : Math.max(0, (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));

  let newState: State;
  let newStability: number;
  let newDifficulty: number;
  let newLapses = card.lapses;
  let scheduledDays: number;
  let dueDateMs: number;

  if (card.state === State.New) {
    // --- New card ---
    newDifficulty = initDifficulty(rating);
    newStability = initStability(rating);

    if (rating === Rating.Again) {
      newState = State.Learning;
      newLapses++;
      scheduledDays = LEARNING_STEPS[0] / (24 * 60);
      dueDateMs = now.getTime() + LEARNING_STEPS[0] * 60 * 1000;
    } else if (rating === Rating.Hard) {
      newState = State.Learning;
      scheduledDays = LEARNING_STEPS[0] / (24 * 60);
      dueDateMs = now.getTime() + LEARNING_STEPS[0] * 60 * 1000;
    } else if (rating === Rating.Good) {
      newState = State.Learning;
      scheduledDays = LEARNING_STEPS[1] / (24 * 60);
      dueDateMs = now.getTime() + LEARNING_STEPS[1] * 60 * 1000;
    } else {
      // Easy -> graduate directly to review
      newState = State.Review;
      const interval = Math.max(1, nextInterval(newStability));
      // Apply easy floor
      const adjustedInterval = Math.max(interval, Math.ceil(newStability * w[16]));
      scheduledDays = adjustedInterval;
      dueDateMs = now.getTime() + adjustedInterval * 24 * 60 * 60 * 1000;
    }
  } else if (card.state === State.Learning || card.state === State.Relearning) {
    // --- Learning / Relearning ---
    const steps =
      card.state === State.Learning ? LEARNING_STEPS : RELEARNING_STEPS;

    if (rating === Rating.Again) {
      newState = card.state;
      newDifficulty = nextDifficulty(card.difficulty, rating);
      newStability = card.state === State.Relearning
        ? Math.max(nextForgetStability(card.difficulty, card.stability, forgettingCurve(elapsedDays, card.stability)), 0.1)
        : initStability(rating);
      if (card.state === State.Learning) newLapses++;
      scheduledDays = steps[0] / (24 * 60);
      dueDateMs = now.getTime() + steps[0] * 60 * 1000;
    } else if (rating === Rating.Hard) {
      newState = card.state;
      newDifficulty = nextDifficulty(card.difficulty, rating);
      newStability = card.stability;
      scheduledDays = steps[0] / (24 * 60);
      dueDateMs = now.getTime() + steps[0] * 60 * 1000;
    } else if (rating === Rating.Good) {
      // Graduate to review
      newState = State.Review;
      newDifficulty = nextDifficulty(card.difficulty, rating);
      newStability = card.stability > 0 ? card.stability : initStability(rating);
      let interval = nextInterval(newStability);
      // Apply w[15] ceiling for graduating cards
      interval = Math.min(interval, Math.max(1, Math.floor(newStability * w[16])));
      interval = Math.max(1, interval);
      scheduledDays = interval;
      dueDateMs = now.getTime() + interval * 24 * 60 * 60 * 1000;
    } else {
      // Easy -> graduate with bonus
      newState = State.Review;
      newDifficulty = nextDifficulty(card.difficulty, rating);
      newStability = card.stability > 0 ? card.stability : initStability(rating);
      let interval = nextInterval(newStability);
      // Apply easy floor
      interval = Math.max(interval, Math.ceil(newStability * w[16]));
      interval = Math.max(1, interval);
      scheduledDays = interval;
      dueDateMs = now.getTime() + interval * 24 * 60 * 60 * 1000;
    }
  } else {
    // --- Review card ---
    const r = forgettingCurve(elapsedDays, card.stability);
    newDifficulty = nextDifficulty(card.difficulty, rating);

    if (rating === Rating.Again) {
      // Lapse -> relearning
      newState = State.Relearning;
      newLapses++;
      newStability = Math.max(
        nextForgetStability(card.difficulty, card.stability, r),
        0.1,
      );
      scheduledDays = RELEARNING_STEPS[0] / (24 * 60);
      dueDateMs = now.getTime() + RELEARNING_STEPS[0] * 60 * 1000;
    } else {
      newState = State.Review;
      newStability = nextRecallStability(card.difficulty, card.stability, r, rating);
      let interval = nextInterval(newStability);

      // Enforce min spread: Hard ceiling, Easy floor
      const prevInterval = card.scheduled_days || 1;
      if (rating === Rating.Hard) {
        interval = Math.min(interval, Math.max(1, Math.floor(prevInterval * w[15])));
        interval = Math.max(1, interval);
      } else if (rating === Rating.Easy) {
        interval = Math.max(interval, Math.ceil(prevInterval * w[16]));
      }
      // Good: just use computed interval but ensure > hard
      if (rating === Rating.Good) {
        const hardInterval = Math.max(1, Math.floor(prevInterval * w[15]));
        interval = Math.max(interval, hardInterval + 1);
      }

      scheduledDays = interval;
      dueDateMs = now.getTime() + interval * 24 * 60 * 60 * 1000;
    }
  }

  const dueDate = new Date(dueDateMs);

  return {
    card: {
      difficulty: newDifficulty,
      stability: newStability,
      state: newState,
      due: dueDate.toISOString(),
      last_review: now.toISOString(),
      lapses: newLapses,
      reps: card.reps + 1,
      elapsed_days: Math.round(elapsedDays),
      scheduled_days: scheduledDays,
      retrievability:
        newState === State.Review
          ? forgettingCurve(scheduledDays, newStability)
          : null,
    },
    reviewLog: {
      rating,
      state: card.state,
      due: dueDate.toISOString(),
      stability: newStability,
      difficulty: newDifficulty,
      elapsed_days: Math.round(elapsedDays),
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
): Record<Rating, { scheduledDays: number; state: State }> {
  const results = {} as Record<Rating, { scheduledDays: number; state: State }>;
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    const result = schedule(card, r, now);
    results[r] = {
      scheduledDays: result.card.scheduled_days!,
      state: result.card.state!,
    };
  }
  return results;
}
