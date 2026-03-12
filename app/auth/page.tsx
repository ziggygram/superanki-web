import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "./auth-form";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/account";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-indigo-950/30">
        <div className="mb-6">
          <Link href="/" className="text-sm text-indigo-300 hover:text-indigo-200">
            ← Back to SuperAnki
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Sign in securely</h1>
        <p className="mt-3 text-slate-400">
          We’ll email you a magic link. No password to leak, no sketchy client-side session hacks.
        </p>
        <AuthForm next={next} />
      </div>
    </main>
  );
}
