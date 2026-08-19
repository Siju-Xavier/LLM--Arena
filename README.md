# LLM Arena

LLM Arena is a model-comparison app for discovering which free AI model is actually worth using. Send one prompt to as many as three models at once, watch their answers stream independently, compare real performance metrics, and vote for the best response.

Those votes build global and personal leaderboards based on real head-to-head comparisons rather than synthetic benchmarks or made-up scores.

## What it does

- Sends one prompt to up to three free OpenRouter models in parallel
- Streams each response independently, so one slow or failed model does not block the others
- Measures time to first token, tokens per second, and total tokens for every answer
- Preserves a separate conversation history for each model during follow-up prompts
- Allows one vote after at least two models successfully answer
- Stores threads and makes them publicly shareable through their URL
- Shows global rankings and a signed-in user's personal leaderboard
- Provides a live catalog of supported free models and their context windows

## Stack

| Area           | Technology                                        | Purpose                                                                     |
| -------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Application    | Next.js 16 App Router, React 19, TypeScript       | Server-rendered pages, route handlers, and the interactive arena            |
| Styling        | Tailwind CSS 4, shadcn-style components, Radix UI | Responsive UI and accessible primitives                                     |
| Models         | OpenRouter                                        | Live free-model catalog and streaming chat completions                      |
| Database       | PostgreSQL, Prisma 7                              | Users, threads, turns, answers, metrics, and votes                          |
| Authentication | Clerk                                             | User identity and protected prompt/vote operations                          |
| Security       | Arcjet                                            | Bot detection, request shielding, prompt-injection checks, and usage limits |
| Analytics      | PostHog                                           | Product events, session analytics, and per-call LLM observability           |
| Tooling        | ESLint, Prettier, Husky, lint-staged              | Code quality and pre-commit checks                                          |

## How it works

Submitting a prompt creates a persisted turn with one pending answer for each selected model. The browser then opens an independent Server-Sent Events request for every answer. Each stream is measured and persisted separately, which isolates failures and keeps the UI responsive.

Votes are immutable and belong to a single turn. Leaderboard appearances include only answers that had completed when the vote was cast, so later retries cannot rewrite the historical comparison.

Public thread reads require no account. Sending prompts, continuing a thread, and voting require the thread owner to be signed in.

## Local development

### Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database
- OpenRouter, Clerk, Arcjet, and PostHog credentials

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and provide the required values:

   ```env
   OPENROUTER_API_KEY=
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   ARCJET_KEY=
   NEXT_PUBLIC_POSTHOG_KEY=
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   DATABASE_URL=
   ```

3. Apply the database migrations and generate the Prisma client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Available commands

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Run the production build
npm run lint     # Run ESLint
npx tsc --noEmit # Check TypeScript without emitting files
```

## Main routes

| Route                 | Description                                      |
| --------------------- | ------------------------------------------------ |
| `/`                   | Start a new model comparison                     |
| `/threads/[threadId]` | Continue an owned thread or read a shared thread |
| `/models`             | Browse the live free-model catalog               |
| `/leaderboard`        | View global or personal model rankings           |

## Design

The interface uses a café-scoreboard visual direction: espresso and latte surfaces, rust for interactive elements and win-rate bars, forest green only for winners, and red only for errors. Dark mode is the default, with a complete light theme available.

The detailed product scope and implementation checklist live in [`docs/scope.md`](docs/scope.md).
