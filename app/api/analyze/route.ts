import {
  propagateAttributes,
  startActiveObservation,
} from "@langfuse/tracing";
import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { MAX_CHARS } from "@/lib/constants";
import { flushLangfuse } from "@/instrumentation.node";
import { runAnalysis } from "@/lib/analysis";
import { getConfiguredModel, resolveModel } from "@/lib/models";
import { getClient } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Defense in depth — proxy gating is optimistic, so re-check at the data source.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.name || "authenticated-user";

  let body: { text?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const text = body?.text;

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide some text to analyse." },
      { status: 400 },
    );
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Text is too long (max ${MAX_CHARS} characters).` },
      { status: 400 },
    );
  }

  // An explicit `model` lets a caller swap provider per request; the allowlist
  // in lib/models.ts is what stops that billing an arbitrary model. With no
  // `model` field we fall back to whatever the environment currently selects,
  // read fresh so a deployed server can change model without a rebuild.
  const requested = body?.model;
  if (requested !== undefined) {
    const chosen = resolveModel(requested);
    if (!chosen) {
      return NextResponse.json(
        { error: "Unknown model." },
        { status: 400 },
      );
    }
    return analyse(chosen, text, userId);
  }

  const configured = getConfiguredModel();
  if (!configured) {
    return NextResponse.json(
      { error: "Server is configured with an unsupported model. Check MODEL." },
      { status: 500 },
    );
  }
  return analyse(configured, text, userId);
}

async function analyse(
  entry: NonNullable<ReturnType<typeof resolveModel>>,
  text: string,
  userId: string,
) {
  const { provider } = entry;

  let client;
  try {
    client = getClient(provider);
  } catch {
    return NextResponse.json(
      {
        error: `Server is missing its ${provider.label} API key. Set ${provider.apiKeyEnv} in .env.local.`,
      },
      { status: 500 },
    );
  }

  const traceMetadata = {
    endpoint: "/api/analyze",
    provider: provider.id,
    model: entry.model,
  };

  const response = await startActiveObservation(
    "writing-analysis",
    (observation) =>
      propagateAttributes(
        {
          traceName: "writing-analysis",
          userId,
          tags: ["writing-analysis"],
          metadata: traceMetadata,
        },
        async () => {
          observation.update({
            input: { text },
            metadata: traceMetadata,
          });

          try {
            const outcome = await runAnalysis(client, entry, text);

            if (!outcome.ok && outcome.kind === "refusal") {
              const error = "The model declined to analyse this text.";
              observation.update({
                level: "WARNING",
                statusMessage: error,
                output: { error },
              });
              return NextResponse.json({ error }, { status: 422 });
            }

            if (!outcome.ok) {
              const error =
                "The model returned an unexpected response. Please try again.";
              observation.update({
                level: "ERROR",
                statusMessage: error,
                output: { error },
              });
              return NextResponse.json({ error }, { status: 502 });
            }

            observation.update({ output: outcome.result });
            return NextResponse.json({ result: outcome.result });
          } catch (err) {
            const status =
              typeof err === "object" && err !== null && "status" in err
                ? Number((err as { status?: number }).status)
                : undefined;
            const message =
              status === 401
                ? `${provider.label} rejected the API key. Check ${provider.apiKeyEnv}.`
                : status === 429
                  ? `Rate limited by ${provider.label}. Please wait a moment and try again.`
                  : "Failed to analyse the text. Please try again.";
            observation.update({
              level: "ERROR",
              statusMessage: message,
              output: { error: message, providerStatus: status },
            });
            return NextResponse.json(
              { error: message },
              { status: status && status >= 400 ? status : 502 },
            );
          }
        },
      ),
  );

  // Keep serverless runtimes alive long enough to export the completed trace.
  after(flushLangfuse);

  return response;
}
