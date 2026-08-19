import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Source_Code_Pro, Source_Sans_3 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { PostHogProvider } from "@/app/posthog/provider";
import { PostHogPageView } from "@/app/posthog/pageview";
import { clerkAppearance } from "@/app/theme/clerk";
import { ThemeProvider } from "@/app/theme/provider";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const sourceCode = Source_Code_Pro({
  variable: "--font-source-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LLM Arena",
  description:
    "Send one prompt, watch up to three AI models answer in parallel, and vote for the best one.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`dark ${fraunces.variable} ${sourceSans.variable} ${sourceCode.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <PostHogProvider>
              <PostHogPageView />
              {children}
            </PostHogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
