# Contributing to Flowrite

Thank you for your interest in contributing to **Flowrite**! Whether you're fixing a bug, adding support for a new AI model, improving accessibility, or expanding test coverage, your help is welcome.

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Ways to Contribute

- **Bug reports & feature requests**: Open an issue in [musayann/flowrite](https://github.com/musayann/flowrite/issues) with clear reproduction steps or use cases.
- **Adding or updating AI models**: Extend the model allowlist in [`lib/models.ts`](lib/models.ts).
- **UI/UX & accessibility polish**: Improve editor interactions, diff views, keyboard shortcuts, or responsive layout under `app/` and `components/`.
- **Tests & coverage**: Add unit or component tests under `tests/` to keep coverage healthy.
- **Prompts & categories**: Refine analysis prompts, schemas, or English issue categories.
- **Documentation**: Clarify setup, configuration, or contributor guides.

---

## Local Development Setup

### Prerequisites

- **Node.js 22** (matching [`.github/workflows/ci.yml`](.github/workflows/ci.yml))
- **npm**

### 1. Fork and Clone

```bash
git clone https://github.com/<your-username>/flowrite.git
cd flowrite
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp env.local.example .env.local
```

At minimum, configure:

1. **Model & API key** — set `MODEL` (defaults to `openai:gpt-4o`) and the matching provider key (`OPENAI_API_KEY`, `GEMINI_API_KEY`, or `ANTHROPIC_API_KEY`). Only the provider for your selected model needs a key.
2. **Auth.js credentials** — set `AUTH_USERNAME`, `AUTH_PASSWORD`, and generate `AUTH_SECRET`:
   ```bash
   npx auth secret
   # or: openssl rand -base64 32
   ```
   For local or self-hosted runs, keep `AUTH_TRUST_HOST=true`.
3. **Optional Langfuse tracing** — set `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` if you want OpenTelemetry tracing (or leave them blank).

### 4. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with your configured `AUTH_USERNAME` and `AUTH_PASSWORD`.

---

## Important Note on Next.js 16

Flowrite runs on **Next.js 16** (`next@16.4.6`), which introduces breaking changes compared to older Next.js releases (for example, `proxy.ts` is used instead of `middleware.ts`, and APIs/conventions may differ from earlier versions).

As noted in [`AGENTS.md`](AGENTS.md):

> Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Code Quality & Testing

Every pull request runs the checks defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Please run them locally before pushing:

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run ESLint across the codebase |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm run test:run` | Run all Vitest suites once (`node` and `dom` projects) |
| `npm run test:coverage` | Run tests with V8 coverage (**CI fails below 75%** on lines, statements, functions, and branches) |
| `npm run build` | Verify the production Next.js build succeeds |

You can also run `npm test` for interactive Vitest watch mode while developing.

### Test Structure

As configured in [`vitest.config.mts`](vitest.config.mts), tests are split into two Vitest projects:

- **`node`**: `tests/lib/**/*.test.ts`, `tests/api/**/*.test.ts`, `tests/auth/**/*.test.ts`, `tests/instrumentation/**/*.test.ts`, `tests/proxy.test.ts`, and `tests/app/manifest.test.ts`
- **`dom`** (`jsdom`): `tests/components/**/*.test.tsx`, `tests/app/page.test.tsx`, and `tests/lib/history.test.ts`

---

## How to Add a New AI Model

Flowrite routes all supported providers through a single OpenAI-compatible client in [`lib/openai.ts`](lib/openai.ts) and validates requested models against an explicit allowlist in [`lib/models.ts`](lib/models.ts).

To add a model for an existing provider (`openai`, `google`, or `anthropic`):

1. Open [`lib/models.ts`](lib/models.ts) and add an entry to `CATALOGUE`:
   ```ts
   ["openai", "your-model-id", "Human-Readable Label"],
   ```
   - `ProviderId`: `"openai" | "google" | "anthropic"`
   - `model`: the exact wire model ID expected by the provider's API
   - `label`: the display name shown in the UI
2. If you are adding a **new provider**, also add it to `PROVIDERS` in [`lib/models.ts`](lib/models.ts) with its `baseURL`, `apiKeyEnv`, and `outputMode` (`"json_schema"` for OpenAI Structured Outputs, or `"tool_call"` for providers that require forced tool calling validated by Zod).
3. Update [`env.local.example`](env.local.example) comments if needed so self-hosters know the new `provider:model` string is available.
4. Add or update unit tests in `tests/lib/` (for example, model resolution and allowlist checks) and run `npm run test:coverage`.

---

## Pull Request Workflow

1. **Create a branch** from `main` using a clear, descriptive name:
   - `feat/add-model-x`
   - `fix/diff-highlight-edge-case`
   - `docs/update-setup-steps`
2. **Keep commits focused** — small, logical commits with clear messages make reviews faster.
3. **Verify locally** before opening your PR:
   ```bash
   npm run lint
   npm run typecheck
   npm run test:coverage
   npm run build
   ```
4. **Open a Pull Request** against `main` in [musayann/flowrite](https://github.com/musayann/flowrite):
   - Link any related issue (`Closes #123`).
   - Summarize what changed and why.
   - Include screenshots or short screen recordings for UI changes.
