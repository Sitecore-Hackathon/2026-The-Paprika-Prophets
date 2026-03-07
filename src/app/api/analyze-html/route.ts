import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/utils/rate-limit";
import { validateHtmlInput, sanitizeForPrompt } from "@/lib/utils/validation";
import { HTML_ANALYSIS_PROMPT } from "@/lib/analysis-prompt";

export async function POST(request: NextRequest) {
  /* ── Rate limiting ───────────────────────────────────────── */
  const callerKey =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const rl = rateLimit(`html:${callerKey}`, 10, 60_000);
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
    const body = await request.json();
    const { html, feedback, previousResult } = body;

    /* ── Input validation ────────────────────────────────────── */
    const htmlError = validateHtmlInput(html);
    if (htmlError) {
      return NextResponse.json({ error: htmlError }, { status: 400 });
    }

    /* ── Prompt injection defence ────────────────────────────── */
    const sanitizedHtml = sanitizeForPrompt(html);

    // Build prompt — append feedback context when reanalyzing
    let prompt = `${HTML_ANALYSIS_PROMPT}\n\nHTML to analyze:\n\`\`\`html\n${sanitizedHtml}\n\`\`\``;
    if (feedback) {
      prompt += `\n\n═══════════════════════════════════════════════\nREANALYSIS INSTRUCTIONS\n═══════════════════════════════════════════════\nThe user reviewed a previous analysis and has the following feedback.\nAdjust your analysis accordingly while still following all rules above.\n\nPrevious result:\n${JSON.stringify(previousResult)}\n\nUser feedback:\n${sanitizeForPrompt(String(feedback))}`;
    }

    // Call OpenAI API
    const t0 = Date.now();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
      response_format: { type: "json_object" },
    });
    const durationMs = Date.now() - t0;

    const result = response.choices[0].message.content;
    const parsed = JSON.parse(result || "{}");
    const usage = response.usage;

    return NextResponse.json({
      success: true,
      analysis: parsed,
      raw: result,
      metadata: {
        stepName: feedback ? "reanalyze-html" : "analyze-html",
        model,
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        durationMs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze HTML";
    console.error("HTML analysis error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
