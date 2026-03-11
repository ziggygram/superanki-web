"use client";

import { useState } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const features = [
  {
    icon: "🧠",
    title: "Spaced Repetition",
    desc: "Powered by the FSRS algorithm. Review at the perfect moment for maximum retention.",
  },
  {
    icon: "🤖",
    title: "AI Study Coach",
    desc: "Get intelligent hints, explanations, and study recommendations tailored to you.",
  },
  {
    icon: "📦",
    title: "Import from Anki",
    desc: "Bring your .apkg decks over seamlessly. No cards left behind.",
  },
  {
    icon: "🎯",
    title: "Quiz Modes",
    desc: "Multiple choice, type-the-answer, and more. Keep it fresh, keep it fun.",
  },
  {
    icon: "📂",
    title: "Folders & Organization",
    desc: "Organize decks into folders. Tag, search, and find anything instantly.",
  },
  {
    icon: "📊",
    title: "Smart Stats",
    desc: "Track your progress with detailed stats and streak tracking.",
  },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email, created_at: new Date().toISOString() }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list! We'll let you know when we launch.");
        setEmail("");
      } else {
        const text = await res.text();
        if (text.includes("duplicate") || text.includes("unique")) {
          setStatus("success");
          setMessage("You're already on the list! We'll be in touch.");
        } else {
          throw new Error(text);
        }
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-gray-950 to-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="animate-fade-in-up text-5xl sm:text-7xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
            SuperAnki
          </h1>
          <p className="animate-fade-in-up-delay-1 mt-6 text-xl sm:text-2xl text-gray-300">
            The smartest way to learn anything
          </p>
          <p className="animate-fade-in-up-delay-2 mt-4 text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
            Spaced repetition powered by the FSRS algorithm, an AI study coach,
            and everything you need to master any subject.
          </p>
          <div className="animate-fade-in-up-delay-3 mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://testflight.apple.com/join/EpjSem6N"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              🚀 Try the Beta
            </a>
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 px-8 py-3.5 text-base font-semibold text-gray-300 hover:border-indigo-500 hover:text-white transition-colors"
            >
              Join Waitlist
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need to learn smarter
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            Built for serious learners who want real results.
          </p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 hover:border-indigo-500/50 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Get early access
          </h2>
          <p className="text-gray-400 mb-8">
            Join the waitlist and be the first to know when SuperAnki launches on the App Store.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-5 py-3.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-xl bg-indigo-600 px-8 py-3.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {status === "loading" ? "Joining..." : "Join Waitlist"}
            </button>
          </form>
          {message && (
            <p
              className={`mt-4 text-sm ${
                status === "success" ? "text-green-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-10">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} SuperAnki. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="https://testflight.apple.com/join/EpjSem6N" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
              TestFlight Beta
            </a>
            <a href="mailto:ilias@superanki.app" className="hover:text-gray-300 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
