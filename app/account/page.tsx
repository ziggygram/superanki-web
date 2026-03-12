import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-indigo-950/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Account</p>
            <h1 className="mt-2 text-3xl font-bold">You’re signed in</h1>
            <p className="mt-3 text-slate-400">
              Auth is now backed by Supabase server-side sessions and protected routes.
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200 hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Email</p>
            <p className="mt-2 text-lg font-semibold">{user.email}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">User ID</p>
            <p className="mt-2 break-all text-sm text-slate-200">{user.id}</p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-5 text-sm text-indigo-100">
          Next step: connect this to real user data like deck backups, waitlist upgrades, or beta-only dashboard features.
        </div>

        <div className="mt-8">
          <Link href="/" className="text-sm text-indigo-300 hover:text-indigo-200">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
