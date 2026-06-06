import { NextResponse } from "next/server";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { AnalysisResult } from "@/lib/schema";

export const runtime = "nodejs";

const MAX_CHARS = 1500;

export async function POST(req: Request) {
  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide some text to analyze." },
      { status: 400 },
    );
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Text is too long (max ${MAX_CHARS} characters).` },
      { status: 400 },
    );
  }

  let openai;
  try {
    openai = getOpenAI();
  } catch {
    return NextResponse.json(
      { error: "Server is missing its OpenAI API key. Set OPENAI_API_KEY in .env.local." },
      { status: 500 },
    );
  }

  try {
    const completion = await openai.chat.completions.parse({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      response_format: zodResponseFormat(AnalysisResult, "analysis"),
    });

    const message = completion.choices[0]?.message;
    if (message?.refusal) {
      return NextResponse.json(
        { error: "The model declined to analyze this text." },
        { status: 422 },
      );
    }
    const parsed = message?.parsed;
    if (!parsed) {
      return NextResponse.json(
        { error: "The model returned an unexpected response. Please try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ result: parsed });
  } catch (err) {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: number }).status)
        : undefined;
    const message =
      status === 401
        ? "OpenAI rejected the API key. Check OPENAI_API_KEY."
        : status === 429
          ? "Rate limited by OpenAI. Please wait a moment and try again."
          : "Failed to analyze the text. Please try again.";
    return NextResponse.json({ error: message }, { status: status && status >= 400 ? status : 502 });
  }
}
