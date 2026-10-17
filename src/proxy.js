import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

//public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api(.*)",
])

// Next 16 renamed middleware.js to proxy.js; it must export `proxy`.
// Protects every route not listed above.
export const proxy = clerkMiddleware(async(auth , req)=>{
  if(!isPublicRoute(req)){
    await auth.protect()
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};