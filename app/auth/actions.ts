"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeRedirect(path: string | null) {
  if (!path || !path.startsWith("/")) return "/account";
  if (path.startsWith("//")) return "/account";
  return path;
}

type AuthActionState = { error?: string; success?: string };

export async function signInWithMagicLink(_: AuthActionState, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const next = normalizeRedirect(String(formData.get("next") || "/account"));
  const origin = (await headers()).get("origin");

  if (!email || !origin) {
    return { error: "Missing email or origin." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your email for a secure sign-in link." };
}

export async function signInWithPassword(_: AuthActionState, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = normalizeRedirect(String(formData.get("next") || "/account"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  redirect(next);
}

export async function signUpWithPassword(_: AuthActionState, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = normalizeRedirect(String(formData.get("next") || "/account"));
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: origin
      ? {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        }
      : undefined,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect(next);
  }

  return { success: "Account created. Check your email if confirmation is required, or sign in with your password." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
