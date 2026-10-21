import { NextResponse } from "next/server";
import db from "@/lib/db";
import { encryptSecret } from "@/lib/secrets";
import { exchangeCode, getGithubUser } from "@/lib/github";
import { getCurrentUser } from "@/modules/auth/actions";
import { STATE_COOKIE, callbackUrl, originOf, safeReturnPath } from "@/modules/github-oauth";

// GitHub sends the user back here after "Connect GitHub". Checks the one-time state, swaps
// the code for a token and stores it (encrypted) on the signed-in user.
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const [expectedState, chatId] = (request.cookies.get(STATE_COOKIE)?.value ?? "").split(".");
  const back = new URL(safeReturnPath(chatId), originOf(request));
  const finish = (status) => {
    back.searchParams.set("github", status);
    const response = NextResponse.redirect(back);
    response.cookies.delete({ name: STATE_COOKIE, path: "/api/github" });
    return response;
  };

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", originOf(request)));
  if (params.get("error")) return finish("cancelled");
  if (!expectedState || params.get("state") !== expectedState || !params.get("code")) return finish("failed");

  try {
    const token = await exchangeCode({ code: params.get("code"), redirectUri: callbackUrl(request) });
    const { login } = await getGithubUser(token);
    await db.user.update({ where: { id: user.id }, data: { githubLogin: login, githubTokenEncrypted: encryptSecret(token) } });
    return finish("connected");
  } catch (error) {
    console.error("GitHub callback failed:", error.message);
    return finish("failed");
  }
}
