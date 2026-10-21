// Shared by the GitHub OAuth routes.
export const STATE_COOKIE = "gh_oauth_state";

/** This app's public origin (behind Vercel's proxy too). */
export const originOf = (request) => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) return `${request.headers.get("x-forwarded-proto") ?? "https"}://${forwardedHost}`;
  return new URL(request.url).origin;
};

export const callbackUrl = (request) => `${originOf(request)}/api/github/callback`;

/** Only same-app chat pages are allowed as the place to return to. */
export const safeReturnPath = (chatId) => (chatId && /^[a-z0-9]+$/i.test(chatId) ? `/chat/${chatId}` : "/");
