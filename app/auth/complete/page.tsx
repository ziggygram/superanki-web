import { AuthCompleteClient } from "./auth-complete-client";

function normalizeRedirect(path: string | undefined) {
  if (!path || !path.startsWith("/")) return "/account";
  if (path.startsWith("//")) return "/account";
  return path;
}

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; flow?: string }>;
}) {
  const params = await searchParams;

  return <AuthCompleteClient next={normalizeRedirect(params.next)} flow={params.flow} />;
}
