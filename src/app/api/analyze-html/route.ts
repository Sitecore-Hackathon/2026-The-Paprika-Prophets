import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";
import { validateHtmlInput, sanitizeForPrompt } from "@/lib/validation";

const ANALYSIS_PROMPT = `You are a Sitecore XM Cloud expert analyzing HTML markup to propose a component template structure.

Analyze the provided HTML and identify:
1. Component name and purpose
2. All fields needed for the component (based on text content, images, links, etc.)
3. Field types (Single-Line Text, Multi-Line Text, Rich Text, Image, Link, etc.)
4. Field descriptions

Return your response in the following JSON structure:
{
  "componentName": "Name of the component",
  "description": "Brief description of what this component does",
  "fields": [
    {
      "name": "FieldName",
      "displayName": "Field Display Name",
      "type": "Single-Line Text|Multi-Line Text|Rich Text|Image|General Link|Date|Checkbox|etc",
      "description": "Purpose of this field",
      "required": true|false
    }
  ],
  "suggestions": "Any additional suggestions or notes"
}

Be specific and thorough in your analysis.`;

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

  try {
    const body = await request.json();
    const { html } = body;

    /* ── Input validation ────────────────────────────────────── */
    const htmlError = validateHtmlInput(html);
    if (htmlError) {
      return NextResponse.json({ error: htmlError }, { status: 400 });
    }

    /* ── Prompt injection defence ────────────────────────────── */
    const sanitizedHtml = sanitizeForPrompt(html);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `${ANALYSIS_PROMPT}\n\nHTML to analyze:\n\`\`\`html\n${sanitizedHtml}\n\`\`\``,
        },
      ],
      max_tokens: 2000,
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
      error instanceof Error ? error.message : "Failed to analyze HTML";
    console.error("HTML analysis error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
