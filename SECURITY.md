# Security Policy

## Supported Versions

Security updates are applied to the latest code on the `main` branch (`0.1.x`).

| Version | Supported |
| ------- | --------- |
| `main` (`0.1.x`) | Yes |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report vulnerabilities privately through GitHub Security Advisories:

- **GitHub Security Advisories**: [Report a vulnerability](https://github.com/musayann/flowrite/security/advisories/new)
- **Maintainer**: [@musayann](https://github.com/musayann) via [musayann/flowrite](https://github.com/musayann/flowrite)

Please include as much detail as possible to help reproduce and assess the issue:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce or a minimal proof of concept
- Affected files, routes, or configuration (if known)

You can expect an acknowledgement within a few days and updates as the issue is investigated and resolved.

## Security & Secret Hygiene

When self-hosting or contributing to Flowrite, keep the following security practices in mind:

### Provider & Observability Keys

- Model API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) and optional Langfuse credentials (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`) are **server-side only**.
- Never prefix secret keys with `NEXT_PUBLIC_` or expose them to client components.
- Never commit `.env.local` or any file containing real credentials (`.env.local` is gitignored; use `env.local.example` as a template).

### Auth.js Secret & Credential Hygiene

- Flowrite uses [Auth.js v5 (`next-auth`)](https://authjs.dev/) with single-user credentials (`AUTH_USERNAME` and `AUTH_PASSWORD`) and stateless JWT sessions (no database, no self-registration).
- Generate a strong, random `AUTH_SECRET` for every deployment:
  ```bash
  npx auth secret
  # or
  openssl rand -base64 32
  ```
- Always replace the placeholder `AUTH_USERNAME` and `AUTH_PASSWORD` values from `env.local.example` with strong credentials.
- Only set `AUTH_TRUST_HOST=true` in self-hosted / non-Vercel deployments when running behind a trusted reverse proxy.

### Model Allowlist & Client Storage

- `/api/analyze` validates requested `provider:model` IDs against the server-side `MODELS` allowlist in `lib/models.ts` so callers cannot invoke arbitrary models billed to your API key.
- Analysis history is stored only in the user's browser (`localStorage`), not on the server.
