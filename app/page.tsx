"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Brain, Sparkles, Package, Target, FolderOpen, Cloud } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gwhympdeyrptdpuxxmlk.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3aHltcGRleXJwdGRwdXh4bWxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTkzMDksImV4cCI6MjA4ODc3NTMwOX0.vDJbhn9Y-3V1ns2sLiCizyRY8c9DoiFdBztSE5T4l2Q";

const featureIcons = [Brain, Sparkles, Package, Target, FolderOpen, Cloud];
const featureColors = [
  "text-violet-400 bg-violet-500/10",
  "text-indigo-400 bg-indigo-500/10",
  "text-cyan-400 bg-cyan-500/10",
  "text-emerald-400 bg-emerald-500/10",
  "text-amber-400 bg-amber-500/10",
  "text-rose-400 bg-rose-500/10",
];

const features = [
  {
    title: "FSRS Algorithm",
    desc: "State-of-the-art spaced repetition. Review at the scientifically optimal moment for maximum retention.",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    title: "AI Study Coach",
    desc: "Personalized tips after every session. AI-powered card generation and leech remediation.",
    gradient: "from-indigo-500 to-cyan-500",
  },
  {
    title: "Import from Anki",
    desc: "Drop in your .apkg files. Sub-decks, media, field mapping — it just works.",
    gradient: "from-cyan-500 to-emerald-500",
  },
  {
    title: "Quiz Modes",
    desc: "Multiple choice, true/false, typed answers. Test yourself beyond flashcards.",
    gradient: "from-emerald-500 to-yellow-500",
  },
  {
    title: "Folders & Drag-Drop",
    desc: "Organize decks into folders. Drag and drop to reorganize. Study entire folders at once.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    title: "Cloud Backup",
    desc: "Your decks backed up securely. Never lose your progress. Sync across devices.",
    gradient: "from-orange-500 to-rose-500",
  },
];

const stats = [
  { value: "10,000+", label: "Cards studied" },
  { value: "FSRS v4", label: "Algorithm" },
  { value: "Free", label: "AI features" },
  { value: "100%", label: "Anki compatible" },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

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
        setMessage("You're on the list! We'll notify you at launch. 🎉");
        setEmail("");
      } else {
        const text = await res.text();
        if (text.includes("duplicate") || text.includes("unique")) {
          setStatus("success");
          setMessage("You're already on the list! We'll be in touch. 💜");
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
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Sticky Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="SuperAnki"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              SuperAnki
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#features"
              className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="https://testflight.apple.com/join/EpjSem6N"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition-colors"
            >
              Try Beta
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-32 pb-20 sm:pt-44 sm:pb-32">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-600/10 rounded-full blur-[80px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Logo */}
          <div className="animate-fade-in-up mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/30 rounded-3xl blur-2xl scale-150" />
              <Image
                src="/logo.png"
                alt="SuperAnki Logo"
                width={120}
                height={120}
                className="relative rounded-3xl shadow-2xl shadow-indigo-500/20"
                priority
              />
            </div>
          </div>

          <h1 className="animate-fade-in-up text-6xl sm:text-8xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Super
            </span>
            <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              Anki
            </span>
          </h1>

          <p className="animate-fade-in-up-delay-1 mt-6 text-xl sm:text-2xl text-gray-300 font-medium">
            The smartest way to learn anything
          </p>

          <p className="animate-fade-in-up-delay-2 mt-4 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Spaced repetition powered by FSRS, an AI study coach that adapts to you,
            and seamless Anki compatibility. Built for learners who want results.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in-up-delay-3 mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://testflight.apple.com/join/EpjSem6N"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.68C5.57 5.89 7.36 4.75 9.29 4.73C10.56 4.71 11.78 5.6 12.57 5.6C13.36 5.6 14.85 4.53 16.39 4.67C17.03 4.69 18.83 4.94 19.95 6.62C19.86 6.68 17.56 8.04 17.58 10.82C17.61 14.17 20.53 15.32 20.57 15.33C20.54 15.42 20.12 16.9 19.03 18.41L18.71 19.5Z" />
              </svg>
              Try the Beta
              <span className="text-indigo-200 group-hover:translate-x-0.5 transition-transform">→</span>
            </a>
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-700/80 bg-gray-900/50 backdrop-blur px-8 py-4 text-base font-semibold text-gray-300 hover:border-indigo-500/50 hover:text-white hover:bg-gray-800/50 transition-all"
            >
              Join Waitlist
            </a>
          </div>

          {/* Coming Soon Badge */}
          <div className="animate-fade-in-up-delay-3 mt-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-800/60 border border-gray-700/50 px-4 py-1.5 text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Coming soon to the App Store
            </span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 text-sm font-medium text-indigo-400 mb-4">
              Features
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                learn smarter
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Built for serious learners who want real results, not gimmicks.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = featureIcons[i];
              return (
                <div
                  key={f.title}
                  className="group relative rounded-2xl border border-gray-800/80 bg-gray-900/30 p-8 hover:border-gray-700/80 transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
                  <div className="relative">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${featureColors[i]} mb-5`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 sm:py-28 bg-gray-900/30">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 text-sm font-medium text-purple-400 mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Start learning in 30 seconds
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "1", title: "Import or Create", desc: "Drop in your .apkg files from Anki, or create fresh decks with AI-generated cards." },
              { step: "2", title: "Study Smart", desc: "FSRS schedules reviews at the optimal time. Study All mode for power sessions." },
              { step: "3", title: "Master It", desc: "Track progress, quiz yourself, and get AI coaching to crush your weak spots." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-xl">
          <div className="relative rounded-3xl border border-gray-800/80 bg-gray-900/50 p-8 sm:p-12 overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full blur-[60px]" />

            <div className="relative text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                Get early access
              </h2>
              <p className="text-gray-400 mb-8">
                Join the waitlist. Be the first to know when SuperAnki hits the App Store.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-700/80 bg-gray-800/50 px-5 py-3.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3.5 font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
                >
                  {status === "loading" ? "Joining..." : "Join Waitlist →"}
                </button>
              </form>

              {message && (
                <p className={`mt-4 text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
                  {message}
                </p>
              )}

              <p className="mt-4 text-xs text-gray-600">No spam. Unsubscribe anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="SuperAnki" width={28} height={28} className="rounded-lg" />
            <span className="text-sm font-semibold text-gray-400">SuperAnki</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <a
              href="https://testflight.apple.com/join/EpjSem6N"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors"
            >
              TestFlight Beta
            </a>
            <a href="mailto:ilias@superanki.app" className="hover:text-gray-300 transition-colors">
              Contact
            </a>
          </div>
          <span className="text-xs text-gray-600">
            © {new Date().getFullYear()} SuperAnki
          </span>
        </div>
      </footer>
    </main>
  );
}
