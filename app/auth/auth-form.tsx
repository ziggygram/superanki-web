"use client";

import { useActionState } from "react";
import { signInWithMagicLink } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function AuthForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInWithMagicLink, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-3.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-indigo-600 px-6 py-3.5 font-semibold hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? "Sending link..." : "Send secure sign-in link"}
      </button>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-400">{state.success}</p> : null}
    </form>
  );
}
