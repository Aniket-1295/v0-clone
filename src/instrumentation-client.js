import * as Sentry from "@sentry/nextjs";

// Browser error monitoring. Off unless NEXT_PUBLIC_SENTRY_DSN is set.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
