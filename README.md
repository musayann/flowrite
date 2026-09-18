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
- **Multi-provider** — OpenAI, Google Gemini and Anthropic Claude, all via the OpenAI SDK against their OpenAI-compatible endpoints. Swappable per deploy or per request.
- **Zod** — schemas shared between the client, the API, and the model
- No database — analysis is stateless on the server, and history lives in the browser's `localStorage`.

## Getting started

### Prerequisites

- Node.js 20+ and npm
- An API key for at least one provider (OpenAI, Google Gemini, or Anthropic)
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
| `MODEL`            | Which model to use, as `provider:model` (see the list below). Defaults to `openai:gpt-4o`. |
| `OPENAI_API_KEY`   | Your OpenAI API key. Used server-side only.                    |
| `GEMINI_API_KEY`   | Your Google Gemini API key. Only needed for `google:` models.  |
| `ANTHROPIC_API_KEY` | Your Anthropic API key. Only needed for `anthropic:` models.  |
| `OPENAI_MODEL`     | Legacy. A bare model id, read as an OpenAI model when `MODEL` is unset. |
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

## Choosing a model

Set `MODEL` to one of the allowlisted ids:

| `MODEL`                              | Provider  |
| ------------------------------------ | --------- |
| `openai:gpt-4o` *(default)*          | OpenAI    |
| `openai:gpt-5-mini`                  | OpenAI    |
| `google:gemini-3.7-flash`            | Google    |
| `google:gemini-3.5-flash-lite`       | Google    |
| `anthropic:claude-sonnet-5`          | Anthropic |
| `anthropic:claude-haiku-4-5-20251001` | Anthropic |

The value is read fresh on every request, so a deployed server picks up a
change without a rebuild. You can also override it for a single request by
sending a `model` field alongside `text` in the POST body — it is validated
against the same list, so no other model can be billed against your key.

Adding a model is one line in `CATALOGUE` in `lib/models.ts`, provided its
provider already exposes an OpenAI-compatible endpoint.

## Scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the development server.     |
| `npm run build` | Build for production.             |
| `npm run start` | Run the production build.         |
| `npm run lint`  | Lint with ESLint.                 |

## How it works

When you submit text, the client calls `app/api/analyze/route.ts`. It resolves the model against the allowlist in `lib/models.ts`, then `lib/analysis.ts` sends the request using a JSON schema derived from `lib/schema.ts`. The response (issues + rewrites) is rendered as highlights and rewrite panels. Your API keys stay on the server and never reach the browser.

Every supported provider speaks the OpenAI wire format, so one SDK client pointed at a different `baseURL` covers all three. What differs is how each is made to return valid JSON:

- **OpenAI and Google** use Structured Outputs (`response_format: json_schema`). The decoder is constrained, so the response cannot violate the schema.
- **Anthropic** uses a forced tool call carrying the same JSON Schema, because its OpenAI-compatibility layer documents `response_format` as ignored. The arguments are validated with Zod on the server instead — conformance is checked rather than guaranteed, and a response that fails validation is reported as an error rather than passed through.

When Langfuse credentials are configured, each analysis creates a `writing-analysis` trace containing the authenticated user, input, structured output, provider and model, token usage, cost, latency, and provider errors. The input and generated output are therefore sent to your configured Langfuse project; set `LANGFUSE_TRACING_ENABLED=false` when that is not appropriate for an environment.

## Project structure

```
app/
  api/analyze/route.ts   # Analysis endpoint — auth, validation, tracing
  login/                 # Login page
  page.tsx               # Main UI
components/               # AnalyzeForm, HighlightedText, IssueCard, VersionPanel, HistoryList, ...
lib/
  schema.ts              # Zod schemas (issues, categories, result)
  prompt.ts              # System prompt for the coach
  models.ts              # Provider registry + model allowlist
  analysis.ts            # The model call — Structured Outputs / forced tool call
  openai.ts              # Per-provider clients wrapped with Langfuse tracing
instrumentation.ts       # Next.js instrumentation entry point
instrumentation.node.ts  # Langfuse OpenTelemetry exporter
auth.ts                  # Auth.js configuration
```
