"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

// Initialize PostHog once on the client with full autocapture & session recording.
if (typeof window !== "undefined") {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (apiKey && apiHost) {
    posthog.init(apiKey, {
      api_host: apiHost,
      // Manual pageview tracking configured via PostHogPageView component for Next.js App Router
      capture_pageview: false,
      capture_pageleave: true,
      // Full autocapture enabled (clicks, form submits, interactions)
      autocapture: true,
      // Session recording with console logs & network tracking
      session_recording: {
        maskAllInputs: false,
      },
      enable_heatmaps: true,
      capture_performance: true,
    });
  }
}

/** Ties PostHog's anonymous ID to the Clerk user once signed in. */
function PostHogIdentify() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });
    } else if (!isSignedIn) {
      posthog.reset();
    }
  }, [isSignedIn, user]);

  return null;
}

export function PostHogProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <PHProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
