import { LangfuseSpanProcessor } from "@langfuse/otel";
import { registerOTel } from "@vercel/otel";

const langfuseGlobal = globalThis as typeof globalThis & {
  flowriteLangfuseRegistered?: boolean;
  flowriteLangfuseSpanProcessor?: LangfuseSpanProcessor;
};

function tracingIsConfigured() {
  return (
    Boolean(process.env.LANGFUSE_PUBLIC_KEY) &&
    Boolean(process.env.LANGFUSE_SECRET_KEY) &&
    process.env.LANGFUSE_TRACING_ENABLED?.toLowerCase() !== "false"
  );
}

function getLangfuseSpanProcessor() {
  if (!tracingIsConfigured()) return null;

  langfuseGlobal.flowriteLangfuseSpanProcessor ??=
    new LangfuseSpanProcessor();

  return langfuseGlobal.flowriteLangfuseSpanProcessor;
}

export function registerLangfuse() {
  if (langfuseGlobal.flowriteLangfuseRegistered) return;

  const spanProcessor = getLangfuseSpanProcessor();
  if (!spanProcessor) return;

  registerOTel({
    serviceName: "flowrite",
    spanProcessors: [spanProcessor],
  });
  langfuseGlobal.flowriteLangfuseRegistered = true;
}

export async function flushLangfuse() {
  await langfuseGlobal.flowriteLangfuseSpanProcessor?.forceFlush();
}
