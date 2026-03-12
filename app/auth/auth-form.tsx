"use client";

import { useActionState, useMemo, useState } from "react";
import { signInWithMagicLink, signInWithPassword, signUpWithPassword } from "./actions";

type Mode = "signin" | "signup" | "magic";
const initialState: { error?: string; success?: string } = {};

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const action = useMemo(() => {
    switch (mode) {
      case "signup":
        return signUpWithPassword;
      case "magic":
        return signInWithMagicLink;
      default:
        return signInWithPassword;
    }
  }, [mode]);

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="mt-8 space-y-5">
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === "signin" ? "bg-indigo-600 text-white" : "text-slate-300"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === "signup" ? "bg-indigo-600 text-white" : "text-slate-300"}`}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === "magic" ? "bg-indigo-600 text-white" : "text-slate-300"}`}
        >
          Magic link
        </button>
      </div>

      <form action={formAction} className="space-y-4">
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

        {mode !== "magic" ? (
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-3.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-indigo-600 px-6 py-3.5 font-semibold hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending
            ? mode === "magic"
              ? "Sending link..."
              : mode === "signup"
                ? "Creating account..."
                : "Signing in..."
            : mode === "magic"
              ? "Send sign-in link"
              : mode === "signup"
                ? "Create account"
                : "Sign in with password"}
        </button>

        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-400">{state.success}</p> : null}
      </form>
    </div>
  );
}
