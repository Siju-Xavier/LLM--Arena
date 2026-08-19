# Scope: LLM Arena

Send one prompt, watch up to three AI models answer it at the same time, and vote for the best one. Over time those votes and the real per-call numbers, speed, tokens, cost, build an honest leaderboard of which model is actually worth using.

Build it in a thin, working slice first, one prompt actually reaching a model and coming back, before making any single part of it fuller. Then thicken it piece by piece. Before building anything, decide what you're doing and why in a few plain sentences, then build it, and if the plan turns out wrong once it's actually built, say so and fix the plan too, not just the code.

Whenever a "build it" style step actually gets underway, break it into its own short list of what's genuinely being done, and check each part off as it's finished, right in this file. That way this file can be opened fresh, in a brand new conversation, and it's obvious what's already done and what's still left, without anyone re-explaining the feature from scratch.

## Stack

Already decided, nothing open here: Next.js (App Router), TypeScript, Tailwind, shadcn for components (card, button, popover, loading skeleton, and whatever else the UI actually needs as it gets built), Prisma with Postgres, Clerk for auth, Arcjet in front of the endpoint, PostHog for analytics and observability.

## Sketches

There are rough hand-drawn sketches for the arena screen, the leaderboard, and the models page. Treat them as structure only, where things sit, what exists on the page, not as the final design or the actual colors, all of that is already decided elsewhere in this file. If something in a sketch genuinely contradicts what's written here, stop and ask which one actually wins rather than guessing.

## At a glance

| #   | Feature                                     | Phase      | Status      |
| --- | ------------------------------------------- | ---------- | ----------- |
| 1   | Connecting to a model                       | Foundation | done        |
| 2   | Coding standards & tooling                  | Foundation | done        |
| 3   | Data model                                  | Foundation | done        |
| 4   | Design & look                               | Foundation | done        |
| 5   | Model picker                                | Slice 1    | in progress |
| 6   | Send a prompt, parallel streams, and voting | Slice 1    | in progress |
| 7   | App shell & thread history                  | Slice 2    | done        |
| 8   | Public thread visibility & sharing          | Slice 3    | done        |
| 9   | Leaderboard: global & personal              | Slice 4    | not started |

## Foundation

### 1. How the app actually connects to a model

The Next.js project itself gets created manually first, `create-next-app`, fast and simple, no reason to spend agent time or tokens on something that easy.

Two real decisions still open once that exists: how the app calls OpenRouter to get a model's answer, and how streaming three models back to the browser at once should actually work. This one's worth real thought: routing all three through one shared connection looks simpler, but if that one connection drops, all three answers die together, which breaks the whole point of one model failing never affecting the others. Decide both properly, then wire them, along with Prisma, Clerk, and Arcjet, into the project that already exists.

PostHog should be wired in from the start too, session replay and heatmaps turned on, and tied to the signed-in user once Clerk resolves, so events are attached to a real person, not left anonymous.

- [x] Decide the approach (three independent SSE connections, pure OpenRouter client)
- [x] Fail-fast environment variable validation at startup (`app/env.ts`)
- [x] OpenRouter pure streaming function (`app/arena/lib/openrouter.ts`)
- [x] Route handler with Arcjet protection (`app/api/chat/route.ts`)
- [x] Clerk auth wiring with Next.js 16 `proxy.ts` and `ClerkProvider` in `app/layout.tsx`
- [x] PostHog provider with session replay, heatmaps, App Router pageview tracking, and Clerk user identification (`app/posthog/`)
- [x] Prisma initialized with PostgreSQL datasource and singleton client (`app/db.ts`)
- [x] Environment example documented in `.env.example`

### 2. Coding standards & tooling

Write down the real conventions for this project once it actually exists, then install linting, formatting, and a pre-commit hook that actually enforces them.

- [x] Decide the approach
- [x] Install lint, format, and whatever else is needed, and write it up in a coding-standards doc

### 3. Data model

The core things every feature depends on: users tied to Clerk, threads, each model's own messages inside a thread, and votes. A vote should only ever be possible on a turn where two or more models actually answered.

- [x] Decide the approach
- [x] Build it

### 4. Design & look

A coffee or dark brown background, warm, not neutral gray or true black. One accent color, rust, used only for things you interact with, buttons, links, focus states, the win-rate bar, never as decoration. Because the background and the accent are both warm tones from the same family, the accent has to stay clearly brighter and more saturated than the background, enough that a button never blends into the page behind it, that's a real risk with two warm colors this close and worth checking by eye, not just by the numbers. Blue, indigo, and purple are never the accent, under any circumstance. Green is reserved only for marking a winner, red only for errors, never reused for anything else. Contrast should genuinely hold up in both light and dark mode, not just look fine at a glance.

Decision: a café scoreboard, not a neon dashboard. Dark espresso is the default; light latte is a full sibling. Rust is `--primary` and `--ring` only. `--accent` is a lifted brown hover, never a second color. Error is a cooler red so it cannot be mistaken for rust. Winner is forest green, never teal. Models stay the same visual treatment until a vote. Type is Fraunces for the wordmark and titles, Source Sans 3 for UI and answers, Source Code Pro for metrics and code. shadcn new-york, 8px radius, no glass, no glow, no per-model neon. Clerk uses the same tokens. The leftover cyan/magenta prototype is a contradiction and gets replaced with a look-proof, not kept.

| Token      | Dark      | Light     | Role                                |
| ---------- | --------- | --------- | ----------------------------------- |
| Background | `#1C1410` | `#F3E6D6` | Page                                |
| Surface    | `#2A1F1A` | `#FFF9F2` | Cards, wells                        |
| Text       | `#F4EDE6` | `#241710` | Body                                |
| Muted      | `#B9A394` | `#7A6558` | Metrics, labels                     |
| Line       | `#3D2E27` | `#E0D0C0` | Borders                             |
| Rust fill  | `#C4451A` | `#C2410C` | Buttons, links, focus, win-rate bar |
| On-rust    | `#FFF8F3` | `#FFF8F3` | Text on rust                        |
| Winner     | `#3F8F5C` | `#1F7A3F` | Winner mark only                    |
| Error      | `#E24B4B` | `#B42318` | Errors only                         |

- [x] Decide the approach
- [x] Build it
  - [x] Coffee/rust tokens in `globals.css`, light and dark
  - [x] shadcn new-york primitives: button, card, input, skeleton
  - [x] Fraunces, Source Sans 3, Source Code Pro
  - [x] `next-themes` dark default, theme toggle
  - [x] Clerk appearance uses the same tokens
  - [x] Replace the cyberpunk home with a look-proof
  - [x] Typecheck, lint, build, check contrast by eye

## Slice 1: Core arena loop

### 5. Model picker

An "Add model" popover pulling OpenRouter's live free-tier list, sorted by context window, capped at three models, defaulting to all three selected, with removable chips next to the prompt box. Also render that same catalog as a simple `/models` page, name, context window, and pricing for each one, so anyone can browse the full list without opening the picker.

- [x] Decide the approach (build the responsive shell first with intentionally static preview data; real thread history, model records, requests, and votes remain owned by later slices)
- [x] Build it
  - [x] Server-only OpenRouter catalog fetch, filtered to text models with zero pricing, sorted by context window, and cached for five minutes
  - [x] Shared `/api/models` catalog endpoint with a small validated response shape and a plain retryable failure message
  - [x] Add-model popover with local selection, a three-model cap, and default selection of the first three catalog results
  - [x] Removable model chips wired into the placeholder response columns and thread-record strip
  - [x] Public `/models` catalog page using the same live data source
  - [x] Persistent responsive top bar and collapsible navigation shell
  - [x] Preview thread list, thread title, and equal model records
  - [x] Placeholder response columns and prompt composer for the future arena loop
  - [x] UI-only controls for sidebar and metrics visibility
  - [x] Connect signed-in thread history and persisted records
  - [ ] Wire streaming and votes from slice 6
  - [x] Typecheck, lint, and build
  - [ ] Inspect desktop and mobile layouts in a browser (dev-server startup verified; this sandbox cannot reach its own loopback server from a separate verification command)

### 6. Send a prompt, parallel streams, and voting

The heart of the product. One prompt goes to every selected model at once, each streaming and failing independently, so one being slow or down never blocks the others. Each answer shows its own real time-to-first-token, tokens per second, and total tokens. No cost shown, every model here is free tier, so it would always read zero. A vote only exists once two or more models have answered, and picking one writes exactly one vote and marks that answer as the winner, while every answer stays visible the whole time. A follow-up continues each model's own separate conversation.

Arcjet sits in front of this endpoint before any model is ever called: rate limiting, bot protection, and a shield against prompt injection, plus a real limit on how much one person can use across all three models at once, not just a limit on the endpoint overall.

Every prompt sent, every answer finishing, and every vote cast should be tracked as a real PostHog event, so there's an honest funnel from prompt to answer to vote. A model failing should also be logged properly on the server, not just shown to the user and forgotten. Separately from that funnel, every actual model call should also be wrapped so PostHog captures its own real tokens, cost, and latency per call, that's PostHog's own LLM analytics, not the same thing as the funnel events or the numbers already shown on the response card.

- [x] Decide the approach (create one persisted turn first, then start one authenticated, independently measured SSE request per pending answer; derive each model's conversation server-side and commit a single immutable vote transactionally)
- [ ] Build it
  - [x] Add explicit answer lifecycle and completion metadata to the data model
  - [x] Create authenticated turns with one pending answer per selected free model
  - [x] Stream each answer independently through an app-owned SSE protocol
  - [x] Persist answer content, failures, TTFT, speed, and token usage
  - [x] Continue follow-ups through each model's own conversation history
  - [x] Enforce Arcjet bot, shield, prompt-injection, and aggregate per-user usage rules
  - [x] Capture prompt, answer, failure, vote, and per-call LLM analytics in PostHog
  - [x] Allow exactly one vote after at least two successful answers
  - [x] Wire the composer, response cards, independent errors, retries, metrics, and winner state
  - [x] Apply the answer-lifecycle migration to the configured database
  - [x] Typecheck, lint, and production build
  - [ ] Exercise a signed-in multi-model prompt and vote in a real browser (production server starts successfully; this sandbox cannot reach its own loopback server from a separate verification command)

## Slice 2: App shell & thread history

### 7. App shell & thread history

The frame everything else sits inside: a top bar and sidebar that stay in place while the page scrolls, the thread's name, and each model's win record shown right there (shrinking down to a small dot and number if it gets crowded). The sidebar lists a signed-in user's own past threads so the tool actually feels usable across visits, not just in one sitting.

- [x] Decide the approach (add authenticated owned-thread read endpoints; hydrate immutable prior turns into the existing shell; keep live streaming isolated to the newly submitted turn; move a new comparison onto its permanent `/threads/[threadId]` URL after creation)
- [x] Build it
  - [x] Add authenticated thread-list and owned-thread detail endpoints
  - [x] Hydrate prior prompts, answers, metrics, failures, and votes
  - [x] Link real recent threads and support starting a new comparison
  - [x] Continue a persisted thread and keep its permanent URL
  - [x] Show real per-model win records with compact responsive treatment
  - [x] Add plain loading, signed-out, empty, and unavailable states
  - [x] Typecheck, lint, and production build

## Slice 3: Public visibility & sharing

### 8. Public thread visibility & sharing

Anyone should be able to open a thread's link and see it, without an account, that's what actually makes it shareable. Only sending a prompt and voting need sign-in. A made-up or deleted thread just shows a plain not-found page either way. The thread's real owner sees everything everyone else sees, plus the ability to actually use it.

- [x] Decide the approach (make thread detail reads public; return viewer ownership separately; keep prompt submission and voting owner-authenticated; render unknown threads through the standard not-found page)
- [x] Build it
  - [x] Expose persisted thread detail without requiring authentication
  - [x] Distinguish owner and read-only visitor capabilities in the UI
  - [x] Render missing or deleted threads as not found
  - [x] Reset all client arena state when navigating between persisted thread routes
  - [x] Typecheck, lint, production build, and smoke test

## Slice 4: Leaderboard

### 9. Leaderboard: global & personal

Two leaderboards from the same votes, one for everyone, one just for the signed-in user. Each row's win rate is the big, bold number, in the accent color, with a small bar next to it, always written as "won 4 of 5," never a bare percentage or a made-up score. Smaller, quieter numbers underneath for average speed and time-to-first-token, each clearly labeled. No cost or "cheapest" stat, every model is free, so that number never means anything here. First place gets a subtle highlight, nobody else does.

- [ ] Decide the approach
- [ ] Build it

## Not doing right now

Kept here so the plan stays honest about what's deliberately left out.

- A "fastest" label on the leaderboard, tagging whichever model already has the best average speed, only for models with enough votes to mean anything. Nice to have, not required.
- Giving each model's own little icon a distinct look instead of plain gray. Nice to have, not required.
- Privacy policy and terms pages.
- Rich link previews when a thread gets shared somewhere.
- Any kind of admin or moderation page.
- A public API for the leaderboard data. Nobody's asked for this.
