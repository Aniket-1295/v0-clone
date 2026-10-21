import * as Sentry from "@sentry/nextjs";

// Server and edge error monitoring. Off unless SENTRY_DSN is set, so local dev and CI need nothing.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

// Errors thrown while rendering, in route handlers and in server actions.
export const onRequestError = Sentry.captureRequestError;
