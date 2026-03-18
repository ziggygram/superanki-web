"use client";

import { useState } from "react";

interface CardDisplayProps {
  front: string;
  back: string;
  isFlipped: boolean;
  onFlip: () => void;
}

export function CardDisplay({ front, back, isFlipped, onFlip }: CardDisplayProps) {
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      onClick={!isFlipped ? onFlip : undefined}
    >
      <div className="min-h-[320px] rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-indigo-950/20 sm:min-h-[400px] sm:p-12">
        {/* Front */}
        <div className="flex flex-col items-center justify-center">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-indigo-300">
            {isFlipped ? "Answer" : "Question"}
          </p>
          <div
            className="prose prose-invert max-w-none text-center text-lg leading-relaxed text-slate-100 sm:text-xl"
            dangerouslySetInnerHTML={{ __html: isFlipped ? back : front }}
          />
        </div>

        {!isFlipped && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFlip();
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
            >
              Show Answer
              <span className="ml-2 text-xs text-slate-500">Space</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
