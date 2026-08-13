# Flowrite

An AI writing coach for British English (en-GB). Paste a sentence or short paragraph and Flowrite returns categorised, inline-highlighted feedback on your writing — plus two rewrites you can copy and learn from.

## What it does

- **Paste text** (up to 1500 characters) and analyse it with **Cmd/Ctrl+Enter**.
- **British English throughout** — the interface, the explanations, and both rewrites use en-GB; US spellings in your text are flagged as word-choice issues.
- **Inline highlights** — issues are marked directly in your text, colour-coded by category, with hover tooltips.
- **8 issue categories** — coherence, information flow, structure, word choice, connector, article, preposition, and clarity.
- **Actionable detail per issue** — the exact excerpt, an explanation of what's off, and a reusable rule you can apply elsewhere.
- **Two rewrites** — a *corrected* version (minimal, targeted fixes) and a *more natural* version (idiomatic rephrasing). Both are one click to copy.
- **History sidebar** — your last ~20 analyses, stored locally in your browser.
- **Light / dark mode.**

## Tech stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **Auth.js v5** — single-user login (Credentials provider, JWT sessions)
- **OpenAI SDK** with Structured Outputs (`json_schema`) for schema-valid responses
- **Zod** — schemas shared between the client, the API, and the model
- No database — analysis is stateless on the server, and history lives in the browser's `localStorage`.

## Getting started

### Prerequisites

- Node.js 20+ and npm
- An OpenAI API key
- A Langfuse project and API keys (optional; the app still runs without tracing)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp env.local.example .env.local

# 3. Fill in .env.local (see below), then generate an auth secret:
npx auth secret
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the credentials you set in `.env.local`.

## Environment variables

Configure these in `.env.local` (see `env.local.example` for the template). Values shown there are placeholders — fill in your own.

| Variable           | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `OPENAI_API_KEY`   | Your OpenAI API key. Used server-side only.                    |
| `OPENAI_MODEL`     | Optional. Any model supporting Structured Outputs. Defaults to `gpt-4o`. |
| `LANGFUSE_PUBLIC_KEY` | Langfuse project public key. Tracing starts when both keys are set. |
| `LANGFUSE_SECRET_KEY` | Langfuse project secret key. Server-side only. |
| `LANGFUSE_BASE_URL` | Optional. Langfuse region or self-hosted URL. Defaults to the EU cloud. |
| `LANGFUSE_TRACING_ENVIRONMENT` | Optional environment label, such as `development` or `production`. |
| `LANGFUSE_RELEASE` | Optional application release/version attached to traces. |
| `LANGFUSE_TRACING_ENABLED` | Optional kill switch. Set to `false` to disable exporting traces. |
| `AUTH_SECRET`      | Signing key for sessions. Generate with `npx auth secret`.     |
| `AUTH_USERNAME`    | The single login username.                                     |
| `AUTH_PASSWORD`    | The single login password.                                     |
| `AUTH_TRUST_HOST`  | Set for self-hosted / non-Vercel deployments.                  |

## Scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the development server.     |
| `npm run build` | Build for production.             |
| `npm run start` | Run the production build.         |
| `npm run lint`  | Lint with ESLint.                 |

## How it works

When you submit text, the client calls `app/api/analyze/route.ts`, which sends a request to the OpenAI API using a JSON schema derived from `lib/schema.ts`. Structured Outputs guarantee the model returns schema-valid JSON (issues + rewrites), which the UI then renders as highlights and rewrite panels. Your OpenAI API key stays on the server and never reaches the browser.

When Langfuse credentials are configured, each analysis creates a `writing-analysis` trace containing the authenticated user, input, structured output, model, token usage, cost, latency, and provider errors. The input and generated output are therefore sent to your configured Langfuse project; set `LANGFUSE_TRACING_ENABLED=false` when that is not appropriate for an environment.

## Project structure

```
app/
  api/analyze/route.ts   # Analysis endpoint — calls OpenAI
  login/                 # Login page
  page.tsx               # Main UI
components/               # AnalyzeForm, HighlightedText, IssueCard, VersionPanel, HistoryList, ...
lib/
  schema.ts              # Zod schemas (issues, categories, result)
  prompt.ts              # System prompt for the coach
  openai.ts              # OpenAI client wrapped with Langfuse tracing
instrumentation.ts       # Next.js instrumentation entry point
instrumentation.node.ts  # Langfuse OpenTelemetry exporter
auth.ts                  # Auth.js configuration
```
