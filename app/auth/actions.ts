"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeRedirect(path: string | null) {
  if (!path || !path.startsWith("/")) return "/account";
  if (path.startsWith("//")) return "/account";
  return path;
}

async function resolveSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const origin = (await headers()).get("origin")?.trim();
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  return "https://www.superanki.app";
}

type AuthActionState = { error?: string; success?: string };

export async function signInWithMagicLink(_: AuthActionState, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const next = normalizeRedirect(String(formData.get("next") || "/account"));
  const siteUrl = await resolveSiteUrl();

  if (!email) {
    return { error: "Missing email." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
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
  const siteUrl = await resolveSiteUrl();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
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
