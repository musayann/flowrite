import { observeOpenAI } from "@langfuse/openai";
import OpenAI from "openai";
import type { Provider } from "@/lib/models";

/**
 * Server-only model clients. API keys are read from the environment and never
 * reach the browser. Importing this module from a client component would fail
 * the build, which is the intended guardrail.
 *
 * Every supported provider speaks the OpenAI wire format, so one SDK pointed at
 * a different `baseURL` covers all of them. The Langfuse wrapper is applied per
 * client at construction and observes whatever `model` each call passes, so it
 * needs no per-request handling.
 */

const clients = new Map<Provider["id"], OpenAI>();

export function getClient(provider: Provider): OpenAI {
  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`${provider.apiKeyEnv} is not set. Add it to .env.local.`);
  }

  const cached = clients.get(provider.id);
  if (cached) return cached;

  const client = observeOpenAI(
    new OpenAI({ apiKey, baseURL: provider.baseURL }),
    {
      generationName: "analyze-writing",
      generationMetadata: { feature: "writing-analysis" },
    },
  );
  clients.set(provider.id, client);
  return client;
}

/** Test hook — drops the cached clients so a fresh key/baseURL is picked up. */
export function __resetClients(): void {
  clients.clear();
}
