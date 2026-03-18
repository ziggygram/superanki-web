"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CompletionState =
  | {
      tone: "loading";
      title: string;
      description: string;
    }
  | {
      tone: "success";
      title: string;
      description: string;
    }
  | {
      tone: "error";
      title: string;
      description: string;
    }
  | {
      tone: "reset";
      title: string;
      description: string;
    };

const RECOVERY_TYPE = "recovery";

function isOtpType(value: string | null): value is EmailOtpType {
  return Boolean(
    value &&
      ["signup", "invite", "magiclink", "recovery", "email_change", "email"].includes(value),
  );
}

function getCleanUrl(next: string, flow?: string | null) {
  const params = new URLSearchParams();
  params.set("next", next);
  if (flow === RECOVERY_TYPE) {
    params.set("flow", flow);
  }
  const query = params.toString();
  return query ? `/auth/complete?${query}` : "/auth/complete";
}

function getSuccessCopy(flow?: string | null) {
  switch (flow) {
    case "confirm":
      return {
        title: "Email confirmed",
        description: "Your account is ready. Redirecting you now.",
      };
    case "magic":
      return {
        title: "Sign-in complete",
        description: "Your secure sign-in link worked. Redirecting you now.",
      };
    default:
      return {
        title: "Authentication complete",
        description: "Your session is ready. Redirecting you now.",
      };
  }
}

export function AuthCompleteClient({ next, flow }: { next: string; flow?: string }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CompletionState>({
    tone: "loading",
    title: "Finishing sign-in",
    description: "We’re confirming your link and preparing your session.",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const hashType = hashParams.get("type");
      const queryType = searchParams.get("type");
      const otpType = isOtpType(queryType) ? queryType : isOtpType(hashType) ? hashType : null;
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const recoveryFlow = flow === RECOVERY_TYPE || otpType === RECOVERY_TYPE || hashType === RECOVERY_TYPE;

      const setCleanUrl = () => {
        window.history.replaceState({}, "", getCleanUrl(next, recoveryFlow ? RECOVERY_TYPE : flow));
      };

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
          setCleanUrl();
        } else if (tokenHash && otpType) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (error) {
            throw error;
          }
          setCleanUrl();
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw error;
          }
          setCleanUrl();
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("This link is invalid or has expired. Request a fresh email and try again.");
        }

        if (recoveryFlow) {
          if (!cancelled) {
            setState({
              tone: "reset",
              title: "Choose a new password",
              description: "Your reset link is confirmed. Set a new password to finish signing back in.",
            });
          }
          return;
        }

        if (!cancelled) {
          const success = getSuccessCopy(flow);
          setState({
            tone: "success",
            title: success.title,
            description: success.description,
          });
          window.setTimeout(() => {
            window.location.assign(next);
          }, 1200);
        }
      } catch (error) {
        if (!cancelled) {
          const description = error instanceof Error ? error.message : "We couldn’t finish this link. Please request a new one.";
          setState({
            tone: "error",
            title: "Link could not be completed",
            description,
          });
        }
      }
    }

    void finishAuth();

    return () => {
      cancelled = true;
    };
  }, [flow, next, searchParams, supabase]);

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    if (password.length < 6) {
      setPasswordError("Use at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordPending(true);

    const { error } = await supabase.auth.updateUser({ password });

    setPasswordPending(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setState({
      tone: "success",
      title: "Password updated",
      description: "Your password has been changed. Redirecting you now.",
    });
    window.setTimeout(() => {
      window.location.assign(next);
    }, 1200);
  }

  const toneClasses =
    state.tone === "success"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
      : state.tone === "error"
        ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
        : "border-white/10 bg-slate-950/70 text-slate-200";

  const Icon = state.tone === "success" ? CheckCircle2 : state.tone === "error" ? ShieldAlert : LoaderCircle;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-indigo-950/30">
        <div className="mb-6">
          <Link href="/auth" className="text-sm text-indigo-300 hover:text-indigo-200">
            ← Back to sign in
          </Link>
        </div>

        <div className={`rounded-3xl border p-6 ${toneClasses}`}>
          <div className="flex items-start gap-3">
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${state.tone === "loading" ? "animate-spin" : ""}`} />
            <div>
              <h1 className="text-2xl font-bold text-white">{state.title}</h1>
              <p className="mt-2 text-sm leading-6">{state.description}</p>
            </div>
          </div>
        </div>

        {state.tone === "reset" ? (
          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-3.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-300">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-3.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={passwordPending}
              className="w-full rounded-2xl bg-indigo-600 px-6 py-3.5 font-semibold hover:bg-indigo-500 disabled:opacity-50"
            >
              {passwordPending ? "Saving password..." : "Save new password"}
            </button>

            {passwordError ? <p className="text-sm text-rose-300">{passwordError}</p> : null}
          </form>
        ) : null}

        {state.tone === "error" ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/auth?next=${encodeURIComponent(next)}`}
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
            >
              Request a new link
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 hover:bg-white/10"
            >
              Back to homepage
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
