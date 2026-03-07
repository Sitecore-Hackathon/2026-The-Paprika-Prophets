import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";
import { validateHtmlInput, sanitizeForPrompt } from "@/lib/validation";

const ANALYSIS_PROMPT = `You are a Sitecore XM Cloud expert analyzing HTML markup to propose Sitecore template structures.

═══ STEP 1 — IDENTIFY COMPONENTS ════════════════════════════
Examine the HTML structure and identify every distinct component block.
A single HTML snippet may describe ONE standalone component OR a LIST (repeater) with parent + child.

═══ STEP 2 — LIST vs STANDALONE ═════════════════════════════
CRITICAL DISTINCTION:
• A LIST/REPEATER has 2+ visually similar items sharing the same structure (e.g. <ul> with repeated <li>, a grid of cards).
  → Always produce THREE templates: Parent (container), Child (single item), Folder (shared data folder).
• A STANDALONE component has unique, non-repeating content.
  → Produce ONE template.

For LIST COMPONENTS (reusable-item pattern):
- PARENT template: isListComponent=true, holds section-level fields (heading, description, "View All" link, etc.)
  IMPORTANT: The parent MUST include an "Items" field of type Treelist (or Multilist) that references child items.
  This allows the same child items to be reused across different list components.
  Set childTemplateName to the child template name.
- CHILD template: holds fields for ONE repeated item. Set parentTemplateName to the parent name.
  The child is stored in a shared data folder and referenced via the parent's Items field.
- FOLDER template: isDatasourceFolder=true, no data fields — a shared container for child items.
  Set parentTemplateName referencing the list parent.
  Insert options on this folder allow creating child items inside it.

For STANDALONE COMPONENTS:
- isListComponent=false, childTemplateName=null, isDatasourceFolder=false, parentTemplateName=null

═══ STEP 3 — EXTRACT FIELDS ═════════════════════════════════
For each template, identify fields from the HTML content:
• Text content → Single-Line Text or Multi-Line Text or Rich Text
• <img> → Image field
• <a href> → General Link field
• Dates → Date field
• Boolean toggles → Checkbox field
• Repeated reference items → Treelist or Multilist field

═══ STEP 4 — RETURN JSON ════════════════════════════════════
Return a JSON object with key "components" — an array:
{
  "components": [
    {
      "componentName": "PascalCaseName",
      "description": "Brief description",
      "visualLocation": "Where it appears (e.g. header, main content area, sidebar, footer)",
      "isListComponent": true|false,
      "childTemplateName": "ChildName" | null,
      "isDatasourceFolder": true|false,
      "parentTemplateName": "ParentName" | null,
      "fields": [
        {
          "name": "PascalCaseFieldName",
          "displayName": "Human Readable Name",
          "type": "Single-Line Text|Multi-Line Text|Rich Text|Image|General Link|Date|Checkbox|Treelist|Multilist|etc",
          "description": "Purpose of this field",
          "required": true|false
        }
      ],
      "variants": [{"name":"Default","description":"Standard layout"}],
      "sxaStyles": [],
      "suggestions": "Any additional notes"
    }
  ]
}

═══ FINAL CHECKLIST ══════════════════════════════════════════
□ Section headings are on the PARENT, not the child
□ List parents have an "Items" field of type Treelist or Multilist referencing child items
□ List components have exactly 3 entries (parent + child + folder)
□ Standalone components are NOT marked as lists
□ Every field has a clear Sitecore type

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
    const { html, feedback, previousResult } = body;

    /* ── Input validation ────────────────────────────────────── */
    const htmlError = validateHtmlInput(html);
    if (htmlError) {
      return NextResponse.json({ error: htmlError }, { status: 400 });
    }

    /* ── Prompt injection defence ────────────────────────────── */
    const sanitizedHtml = sanitizeForPrompt(html);

    // Build prompt — append feedback context when reanalyzing
    let prompt = `${ANALYSIS_PROMPT}\n\nHTML to analyze:\n\`\`\`html\n${sanitizedHtml}\n\`\`\``;
    if (feedback) {
      prompt += `\n\nREANALYSIS INSTRUCTIONS:\nThe user reviewed a previous analysis and has the following feedback.\nAdjust your analysis accordingly.\n\nPrevious result:\n${JSON.stringify(previousResult)}\n\nUser feedback:\n${sanitizeForPrompt(String(feedback))}`;
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4000,
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
