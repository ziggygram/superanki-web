import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/home-page-client";

function getAuthCompletionRedirect(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  if (!params.has("code") && !params.has("token_hash") && !params.has("type")) {
    return null;
  }

  if (!params.has("next")) {
    params.set("next", "/account");
  }

  return `/auth/complete?${params.toString()}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const authRedirect = getAuthCompletionRedirect(params);

  if (authRedirect) {
    redirect(authRedirect);
  }

  return <HomePageClient />;
}
