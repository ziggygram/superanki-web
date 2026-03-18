"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Brain, Sparkles, Package, Target, FolderOpen, Cloud } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gwhympdeyrptdpuxxmlk.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3aHltcGRleXJwdGRwdXh4bWxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTkzMDksImV4cCI6MjA4ODc3NTMwOX0.vDJbhn9Y-3V1ns2sLiCizyRY8c9DoiFdBztSE5T4l2Q";

const features = [
  {
    icon: Brain,
    title: "FSRS Spaced Repetition",
    desc: "Review cards at the scientifically optimal moment for better retention.",
  },
  {
    icon: Sparkles,
    title: "AI Study Coach",
    desc: "Get guidance, hints, and help generating better study material.",
  },
  {
    icon: Package,
    title: "Anki Import",
    desc: "Bring over your existing .apkg decks without painful migration.",
  },
  {
    icon: Target,
    title: "Quiz Modes",
    desc: "Go beyond flashcards with multiple choice, typed answers, and more.",
  },
  {
    icon: FolderOpen,
    title: "Folders & Organization",
    desc: "Keep decks tidy with folders, grouping, and study-all workflows.",
  },
  {
    icon: Cloud,
    title: "Cloud Backup",
    desc: "Back up your decks and progress so your study data stays safe.",
  },
];

const stats = [
  { value: "FSRS", label: "Smart scheduling" },
  { value: "AI", label: "Study help" },
  { value: ".apkg", label: "Anki import" },
  { value: "iOS", label: "Native app" },
];

export function HomePageClient() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    const hasHashAuth =
      hashParams.has("access_token") ||
      hashParams.has("refresh_token") ||
      hashParams.get("type") === "recovery";

    if (!hasHashAuth) {
      return;
    }

    const target = `/auth/complete?next=${encodeURIComponent("/account")}${window.location.hash}`;
    window.location.replace(target);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("You’re on the list.");
        setEmail("");
      } else {
        const text = await res.text();
        if (text.toLowerCase().includes("duplicate") || text.toLowerCase().includes("unique")) {
          setStatus("success");
          setMessage("You’re already on the list.");
        } else {
          throw new Error(text);
        }
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav
        className={`sticky top-0 z-50 transition-all ${
          scrolled ? "border-b border-white/10 bg-slate-950/90 backdrop-blur" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="SuperAnki" width={36} height={36} className="rounded-xl" />
            <span className="text-base font-semibold tracking-tight">SuperAnki</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden text-sm text-slate-300 sm:block">
              Features
            </a>
            <a href="/auth" className="hidden text-sm text-slate-300 sm:block">
              Sign in
            </a>
            <a
              href="https://testflight.apple.com/join/EpjSem6N"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
            >
              Try Beta
            </a>
          </div>
        </div>
      </nav>

      <section className="px-6 pb-16 pt-16 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-sm text-indigo-200">
              Native flashcards for serious learners
            </div>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              Learn faster with
              <span className="block bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                SuperAnki
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              FSRS scheduling, Anki import, quiz modes, AI study help, and cloud backup. Built to make studying feel clean, fast, and actually effective.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://testflight.apple.com/join/EpjSem6N"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3.5 font-semibold hover:bg-indigo-500"
              >
                Download the beta
              </a>
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-slate-200 hover:bg-white/10"
              >
                Join waitlist
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl shadow-indigo-950/40">
              <div className="mb-5 flex items-center gap-3">
                <Image src="/logo.png" alt="SuperAnki app icon" width={56} height={56} className="rounded-2xl" />
                <div>
                  <div className="text-lg font-semibold">SuperAnki</div>
                  <div className="text-sm text-slate-400">The smartest way to learn anything</div>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
                  <span className="text-slate-300">Today’s reviews</span>
                  <span className="font-semibold text-white">84</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
                  <span className="text-slate-300">Retention</span>
                  <span className="font-semibold text-emerald-400">92%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
                  <span className="text-slate-300">Study streak</span>
                  <span className="font-semibold text-indigo-300">17 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 sm:py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to study properly</h2>
            <p className="mt-3 text-lg text-slate-400">
              SuperAnki keeps the power-user features, but makes the experience feel modern instead of painful.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                  <div className="mb-4 inline-flex rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-slate-400">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="waitlist" className="px-6 pb-20 pt-6 sm:pb-28">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 sm:p-10">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold sm:text-4xl">Get early access</h2>
            <p className="mt-3 text-slate-400">
              Join the waitlist and get notified when SuperAnki is ready for broader release.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-5 py-3.5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-2xl bg-indigo-600 px-6 py-3.5 font-semibold hover:bg-indigo-500 disabled:opacity-50"
            >
              {status === "loading" ? "Joining..." : "Join waitlist"}
            </button>
          </form>

          {message ? (
            <p
              className={`mt-4 text-sm ${
                status === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
