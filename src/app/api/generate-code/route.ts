import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeForPrompt } from "@/lib/validation";

/* ── System prompt for code generation ─────────────────────────── */

const SYSTEM_PROMPT = `You are a Sitecore XM Cloud / Content SDK expert.
You generate production-ready Next.js component code that follows the @sitecore-content-sdk/nextjs patterns.

RULES:
1. Use TypeScript (.tsx).
2. Import field types from "@sitecore-content-sdk/nextjs":
   - Text, RichText, ImageField, LinkField, DateField, TextField, etc.
3. Import helper components from "@sitecore-content-sdk/nextjs":
   - Text (renders Single-Line Text & Multi-Line Text)
   - RichText (renders Rich Text)
   - Image (renders Image fields)
   - Link (renders General Link fields)
   - DateField (renders Date / Datetime)
4. Component props interface must extend ComponentRendering:
   \`\`\`ts
   import { ComponentRendering } from "@sitecore-content-sdk/nextjs";
   \`\`\`
5. Use the field helper components for inline editing support:
   \`\`\`tsx
   <Text field={fields.Title} />
   <RichText field={fields.Body} />
   <Image field={fields.HeroImage} />
   <Link field={fields.CallToAction} />
   \`\`\`
6. For list components with a Treelist/Multilist "Items" field:
   - The Items field value is an array of referenced items.
   - Map over items and render the child component for each.
7. Generate proper TypeScript types for all field shapes.
8. Include JSDoc comments on the component and its props.
9. Handle variants via the \`params\` object:
   \`\`\`ts
   const variant = props.params?.Variant ?? "Default";
   \`\`\`
10. Handle SXA styles via the \`params\` object:
    \`\`\`ts
    const styles = props.params?.Styles ?? "";
    \`\`\`
11. Use Tailwind CSS for styling.
12. Keep the component self-contained in a single file unless it references a child component — then generate that file too.
13. Return ONLY the code fenced in markdown code blocks. One block per file. Start each block with the relative file path as a comment:
    \`\`\`tsx
    // src/components/MyComponent.tsx
    ...code...
    \`\`\`

STRUCTURE:
For standalone components → one file.
For list components → parent file + child file.

Return raw code only. No surrounding prose.`;

/* ── Route handler ─────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  /* Rate limiting */
  const callerKey =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const rl = rateLimit(`codegen:${callerKey}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  /* API key */
  const apiKey =
    request.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No OpenAI API key provided." },
      { status: 401 },
    );
  }

  /* Coding model — falls back to a sensible default */
  const model = request.headers.get("x-coding-model") || "gpt-4.1";
  const isCodexModel = model.toLowerCase().includes("codex");

  const openai = new OpenAI({ apiKey });

  try {
    const body = await request.json();
    const { components, groups } = body;

    if (!components || !Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: "No components provided." },
        { status: 400 },
      );
    }

    /* Build a user prompt describing the templates */
    const userPrompt = buildUserPrompt(components, groups);

    let code: string;

    if (isCodexModel) {
      /* Codex models use the Responses API */
      const response = await openai.responses.create({
        model,
        instructions: SYSTEM_PROMPT,
        input: sanitizeForPrompt(userPrompt),
        max_output_tokens: 8000,
        temperature: 0.2,
      });
      code = response.output_text ?? "";
    } else {
      /* Chat models use the Chat Completions API */
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: sanitizeForPrompt(userPrompt) },
        ],
        max_tokens: 8000,
        temperature: 0.2,
      });
      code = response.choices[0].message.content ?? "";
    }

    return NextResponse.json({ success: true, code, model });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Code generation failed";
    console.error("Code generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ── Prompt builder ────────────────────────────────────────────── */

function buildUserPrompt(
  components: Record<string, unknown>[],
  groups?: Record<string, unknown>[],
): string {
  const lines: string[] = [
    "Generate Next.js component code for the following Sitecore template definitions.",
    "",
  ];

  if (groups && Array.isArray(groups)) {
    lines.push("Template Groups:");
    for (const g of groups) {
      lines.push(`  - ${g.label} (${g.type})`);
    }
    lines.push("");
  }

  lines.push("Components / Templates:");
  lines.push("```json");
  lines.push(JSON.stringify(components, null, 2));
  lines.push("```");
  lines.push("");
  lines.push(
    "For each component, generate the Content SDK compatible code as described in the system instructions.",
  );

  return lines.join("\n");
}
