// Shared by the GitHub OAuth routes.
export const STATE_COOKIE = "gh_oauth_state";

/** This app's public origin (behind Vercel's proxy too). */
export const originOf = (request) => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) return `${request.headers.get("x-forwarded-proto") ?? "https"}://${forwardedHost}`;
  return new URL(request.url).origin;
};

export const callbackUrl = (request) => `${originOf(request)}/api/github/callback`;

// Where "Connect GitHub" was started from when it was not a chat.
export const IMPORT_RETURN = "import";

/** Only same-app pages are allowed as the place to return to: a chat, or the import page. */
export const safeReturnPath = (target) => {
  if (target === IMPORT_RETURN) return "/import";
  return target && /^[a-z0-9]+$/i.test(target) ? `/chat/${target}` : "/";
};
