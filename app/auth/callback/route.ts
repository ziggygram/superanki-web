import { type NextRequest, NextResponse } from "next/server";

function normalizeRedirect(path: string | null) {
  if (!path || !path.startsWith("/")) return "/account";
  if (path.startsWith("//")) return "/account";
  return path;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = normalizeRedirect(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL("/auth/complete", request.url);
  redirectUrl.search = requestUrl.search;
  redirectUrl.searchParams.set("next", next);
  return NextResponse.redirect(redirectUrl);
}
