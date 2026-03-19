"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Rating, State, schedule, previewSchedule, dueLabel } from "@/lib/fsrs";
import { ReviewAction, saveReviewResults } from "@/lib/study";
import { CardDisplay } from "@/components/card-display";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";

interface StudySessionProps {
  cards: Card[];
  deckName: string;
  deckId: string;
  userId: string;
}

const RATING_CONFIG = [
  { rating: Rating.Again, label: "Again", color: "bg-red-600 hover:bg-red-500", key: "1" },
  { rating: Rating.Hard, label: "Hard", color: "bg-orange-600 hover:bg-orange-500", key: "2" },
  { rating: Rating.Good, label: "Good", color: "bg-green-600 hover:bg-green-500", key: "3" },
  { rating: Rating.Easy, label: "Easy", color: "bg-blue-600 hover:bg-blue-500", key: "4" },
];

export function StudySession({ cards: initialCards, deckName, deckId, userId }: StudySessionProps) {
  const [queue, setQueue] = useState<Card[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewActions, setReviewActions] = useState<ReviewAction[]>([]);
  const [isComplete, setIsComplete] = useState(initialCards.length === 0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentCard = queue[currentIndex] ?? null;
  const now = new Date();
  const preview = currentCard ? previewSchedule(currentCard, now) : null;

  const handleRating = useCallback(
    (rating: Rating) => {
      if (!currentCard || !isFlipped) return;

      const result = schedule(currentCard, rating, new Date());
      const action: ReviewAction = {
        card: currentCard,
        rating,
        timestamp: new Date(),
        result,
      };

      const newActions = [...reviewActions, action];
      setReviewActions(newActions);

      // If the card goes back to learning/relearning, re-add to end of queue
      if (
        result.card.state === State.Learning ||
        result.card.state === State.Relearning
      ) {
        const updatedCard = { ...currentCard, ...result.card } as Card;
        setQueue((q) => [...q, updatedCard]);
      }

      if (currentIndex + 1 >= queue.length && 
          !(result.card.state === State.Learning || result.card.state === State.Relearning)) {
        // Session complete
        finishSession(newActions);
      } else {
        setCurrentIndex((i) => i + 1);
        setIsFlipped(false);
      }
    },
    [currentCard, isFlipped, currentIndex, queue.length, reviewActions],
  );

  const finishSession = async (actions: ReviewAction[]) => {
    setIsSaving(true);
    const { success, error } = await saveReviewResults(actions, userId);
    setIsSaving(false);
    if (!success) {
      setSaveError(error ?? "Failed to save");
    }
    setIsComplete(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space" && !isFlipped) {
        e.preventDefault();
        setIsFlipped(true);
      } else if (isFlipped) {
        if (e.key === "1") handleRating(Rating.Again);
        else if (e.key === "2") handleRating(Rating.Hard);
        else if (e.key === "3") handleRating(Rating.Good);
        else if (e.key === "4") handleRating(Rating.Easy);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFlipped, handleRating]);

  // Stats
  const totalReviewed = reviewActions.length;
  const againCount = reviewActions.filter((a) => a.rating === Rating.Again).length;
  const correctCount = reviewActions.filter((a) => a.rating >= Rating.Good).length;
  const accuracy = totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0;

  if (isComplete) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="rounded-full bg-green-500/10 p-6">
          <CheckCircle2 className="h-16 w-16 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-white">Session Complete!</h2>
        {saveError && (
          <p className="text-sm text-red-400">Warning: {saveError}</p>
        )}
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-indigo-300">{totalReviewed}</p>
            <p className="text-sm text-slate-400">Cards reviewed</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-300">{accuracy}%</p>
            <p className="text-sm text-slate-400">Accuracy</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-300">{againCount}</p>
            <p className="text-sm text-slate-400">Lapses</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Link
            href="/study"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-200 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to decks
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500"
          >
            <RotateCcw className="h-4 w-4" />
            Study again
          </button>
        </div>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        <p className="text-slate-300">Saving your progress...</p>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-300">No cards due right now.</p>
        <Link
          href="/study"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-200 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to decks
        </Link>
      </div>
    );
  }

  const remaining = queue.length - currentIndex;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{deckName}</span>
        <span>{remaining} remaining</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <CardDisplay
        front={currentCard.front}
        back={currentCard.back}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(true)}
      />

      {/* Rating buttons */}
      {isFlipped && preview && (
        <div className="grid grid-cols-4 gap-3">
          {RATING_CONFIG.map(({ rating, label, color, key }) => {
            const p = preview[rating];
            const intervalLabel = dueLabel(p.scheduledDays, p.state, p.rating);
            return (
              <button
                key={rating}
                onClick={() => handleRating(rating)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-4 font-semibold text-white transition ${color}`}
              >
                <span className="text-sm">{label}</span>
                <span className="text-xs opacity-75">{intervalLabel}</span>
                <span className="text-[10px] opacity-50">{key}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Session stats bar */}
      <div className="flex justify-center gap-6 text-xs text-slate-500">
        <span>Reviewed: {totalReviewed}</span>
        <span>Accuracy: {accuracy}%</span>
        <span>Lapses: {againCount}</span>
      </div>
    </div>
  );
}
