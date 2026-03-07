import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";
import { validateImageFile } from "@/lib/validation";
import { SCREENSHOT_ANALYSIS_PROMPT } from "@/lib/analysis-prompt";

export async function POST(request: NextRequest) {
  /* ── Rate limiting ───────────────────────────────────────── */
  const callerKey =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const rl = rateLimit(`screenshot:${callerKey}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  /* ── API key resolution ──────────────────────────────────── */
  const apiKey =
    request.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No OpenAI API key provided. Please configure your key in Settings.",
      },
      { status: 401 },
    );
  }
  const openai = new OpenAI({ apiKey });

  /* ── Analysis model ──────────────────────────────────────── */
  const model = request.headers.get("x-analysis-model") || "gpt-5-mini";

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    /* ── Input validation ────────────────────────────────────── */
    const fileError = validateImageFile(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    // Read optional reanalysis fields
    const feedback = (formData.get("feedback") as string) ?? "";
    const previousResult = (formData.get("previousResult") as string) ?? "";

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/png";

    // Build prompt — append feedback context when reanalyzing
    let prompt = SCREENSHOT_ANALYSIS_PROMPT;
    if (feedback) {
      prompt += `\n\n═══════════════════════════════════════════════\nREANALYSIS INSTRUCTIONS\n═══════════════════════════════════════════════\nThe user reviewed a previous analysis and has the following feedback.\nAdjust your analysis accordingly while still following all rules above.\n\nPrevious result:\n${previousResult}\n\nUser feedback:\n${feedback}`;
    }

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 8000,
      response_format: { type: "json_object" },
    });

    const result = response.choices[0].message.content;
    const parsed = JSON.parse(result || "{}");

    return NextResponse.json({
      success: true,
      analysis: parsed,
      raw: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze screenshot";
    console.error("Screenshot analysis error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
