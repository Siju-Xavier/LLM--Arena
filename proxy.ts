// Clerk auth proxy — runs on every matched request.
// Next.js 16 renamed middleware.ts → proxy.ts and the export to `proxy`.
// Clerk's helper wraps a standard proxy function and attaches auth state.

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static assets unless in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
