// Environment variable validation.
// Imported once at app startup; crashes immediately if anything is missing.
// Every variable the app needs lives here — no other file reads process.env directly.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to .env.local (see .env.example).`
    );
  }
  return value;
}

/** OpenRouter API key for model calls. */
export const OPENROUTER_API_KEY = required("OPENROUTER_API_KEY");

/** Clerk – public key embedded in the client bundle. */
export const NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = required("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");

/** Clerk – secret key, server-side only. */
export const CLERK_SECRET_KEY = required("CLERK_SECRET_KEY");

/** Arcjet – site key for rate-limiting / bot protection. */
export const ARCJET_KEY = required("ARCJET_KEY");

/** PostHog – project API key (public, used client- and server-side). */
export const NEXT_PUBLIC_POSTHOG_KEY = required("NEXT_PUBLIC_POSTHOG_KEY");

/** PostHog – ingestion host. */
export const NEXT_PUBLIC_POSTHOG_HOST = required("NEXT_PUBLIC_POSTHOG_HOST");

/** Postgres connection string for Prisma. */
export const DATABASE_URL = required("DATABASE_URL");
