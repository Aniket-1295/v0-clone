import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/actions";
import { authorizeUrl, isGithubConfigured } from "@/lib/github";
import { IMPORT_RETURN, STATE_COOKIE, callbackUrl, originOf, safeReturnPath } from "@/modules/github-oauth";

// Starts "Connect GitHub": sends the signed-in user to GitHub to approve access.
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  // A chat id, or "import" when started from the import page.
  const chatId = params.get("chatId") ?? (params.get("return") === IMPORT_RETURN ? IMPORT_RETURN : null);
  const back = new URL(safeReturnPath(chatId), originOf(request));

  if (!(await getCurrentUser())) return NextResponse.redirect(new URL("/sign-in", originOf(request)));
  if (!isGithubConfigured()) {
    back.searchParams.set("github", "not-configured");
    return NextResponse.redirect(back);
  }

  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(authorizeUrl({ state, redirectUri: callbackUrl(request) }));
  response.cookies.set(STATE_COOKIE, `${state}.${chatId ?? ""}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/github",
    maxAge: 10 * 60,
  });
  return response;
}
