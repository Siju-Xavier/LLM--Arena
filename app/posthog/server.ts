import { PostHog } from "posthog-node";

// Server-side PostHog singleton client for API routes / Server Actions
export function getServerPostHog(): PostHog {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !host) {
    throw new Error(
      "Missing PostHog environment variables (NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST)."
    );
  }

  return new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
}
