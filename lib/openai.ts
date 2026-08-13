import { observeOpenAI } from "@langfuse/openai";
import OpenAI from "openai";

/**
 * Server-only OpenAI client. The API key is read from the environment and
 * never reaches the browser. Importing this module from a client component
 * would fail the build, which is the intended guardrail.
 */

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env.local.");
  }
  if (!client) {
    client = observeOpenAI(new OpenAI({ apiKey }), {
      generationName: "analyze-writing",
      generationMetadata: { feature: "writing-analysis" },
    });
  }
  return client;
}
