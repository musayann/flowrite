export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerLangfuse } = await import("./instrumentation.node");
    registerLangfuse();
  }
}
