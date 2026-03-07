import { NextRequest, NextResponse } from "next/server";
import { validateImageFile } from "@/lib/utils/validation";
import { SCREENSHOT_ANALYSIS_PROMPT } from "@/lib/analysis-prompt";
import { DEFAULT_ANALYSIS_MODEL, HEADERS } from "@/lib/constants";
import { guardRoute, buildMetadata, errorResponse } from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  const guard = guardRoute(request, "screenshot");
  if (!guard.ok) return guard.response;

  const model = request.headers.get(HEADERS.ANALYSIS_MODEL) || DEFAULT_ANALYSIS_MODEL;

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    const fileError = validateImageFile(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const feedback = (formData.get("feedback") as string) ?? "";
    const previousResult = (formData.get("previousResult") as string) ?? "";

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/png";

    let prompt = SCREENSHOT_ANALYSIS_PROMPT;
    if (feedback) {
      prompt += `\n\n═══════════════════════════════════════════════\nREANALYSIS INSTRUCTIONS\n═══════════════════════════════════════════════\nThe user reviewed a previous analysis and has the following feedback.\nAdjust your analysis accordingly while still following all rules above.\n\nPrevious result:\n${previousResult}\n\nUser feedback:\n${feedback}`;
    }

    const t0 = Date.now();
    const response = await guard.openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          ],
        },
      ],
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
        feedback ? "reanalyze-screenshot" : "analyze-screenshot",
        model,
        response.usage,
        durationMs,
      ),
    });
  } catch (error: unknown) {
    return errorResponse(error, "Screenshot analysis error");
  }
}
