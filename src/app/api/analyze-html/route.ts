import { NextRequest, NextResponse } from "next/server";
import { validateHtmlInput, sanitizeForPrompt } from "@/lib/utils/validation";
import { HTML_ANALYSIS_PROMPT } from "@/lib/analysis-prompt";
import { DEFAULT_ANALYSIS_MODEL, HEADERS } from "@/lib/constants";
import { guardRoute, buildMetadata, errorResponse } from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  const guard = guardRoute(request, "html");
  if (!guard.ok) return guard.response;

  const model = request.headers.get(HEADERS.ANALYSIS_MODEL) || DEFAULT_ANALYSIS_MODEL;

  try {
    const body = await request.json();
    const { html, feedback, previousResult } = body;

    const htmlError = validateHtmlInput(html);
    if (htmlError) {
      return NextResponse.json({ error: htmlError }, { status: 400 });
    }

    const sanitizedHtml = sanitizeForPrompt(html);

    let prompt = `${HTML_ANALYSIS_PROMPT}\n\nHTML to analyze:\n\`\`\`html\n${sanitizedHtml}\n\`\`\``;
    if (feedback) {
      prompt += `\n\n═══════════════════════════════════════════════\nREANALYSIS INSTRUCTIONS\n═══════════════════════════════════════════════\nThe user reviewed a previous analysis and has the following feedback.\nAdjust your analysis accordingly while still following all rules above.\n\nPrevious result:\n${JSON.stringify(previousResult)}\n\nUser feedback:\n${sanitizeForPrompt(String(feedback))}`;
    }

    const t0 = Date.now();
    const response = await guard.openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 8000,
      response_format: { type: "json_object" },
    });
    const durationMs = Date.now() - t0;

    const result = response.choices[0].message.content;
    const parsed = JSON.parse(result || "{}");

    return NextResponse.json({
      success: true,
      analysis: parsed,
      raw: result,
      metadata: buildMetadata(
        feedback ? "reanalyze-html" : "analyze-html",
        model,
        response.usage,
        durationMs,
      ),
    });
  } catch (error: unknown) {
    return errorResponse(error, "HTML analysis error");
  }
}
