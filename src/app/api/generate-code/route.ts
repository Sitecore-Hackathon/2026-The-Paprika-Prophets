import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/utils/rate-limit";
import { sanitizeForPrompt } from "@/lib/utils/validation";

/* ── System prompt for code generation ─────────────────────────── */

const SYSTEM_PROMPT = `You are a SitecoreAI (formerly: XM Cloud) / Content SDK expert.
You generate production-ready Next.js component code that follows the @sitecore-content-sdk/nextjs patterns exactly.

═══ IMPORTS ═══════════════════════════════════════════════
1. Always import React and JSX:
   \`\`\`ts
   import React, { JSX } from 'react';
   \`\`\`
2. Import field types and helpers from "@sitecore-content-sdk/nextjs".
   Use aliased imports for rendering helpers to avoid naming collisions:
   \`\`\`ts
   import {
     NextImage as ContentSdkImage,
     Link as ContentSdkLink,
     RichText as ContentSdkRichText,
     Text,
     DateField,
     ImageField,
     Field,
     LinkField,
   } from '@sitecore-content-sdk/nextjs';
   \`\`\`
3. Import ComponentProps from the project's shared types:
   \`\`\`ts
   import { ComponentProps } from 'lib/component-props';
   \`\`\`

═══ FIELD TYPES ═══════════════════════════════════════════
Map Sitecore field types to TypeScript types:
- Single-Line Text → Field<string>
- Multi-Line Text  → Field<string>
- Rich Text        → Field<string>
- Image            → ImageField
- General Link     → LinkField
- Date / Datetime  → Field<string>
- Checkbox         → Field<boolean>
- Integer / Number → Field<number>

═══ PROPS PATTERN ═════════════════════════════════════════
Define a Fields interface + a Props type that intersects ComponentProps:
\`\`\`ts
interface Fields {
  Title: Field<string>;
  HeroImage: ImageField;
  CallToAction: LinkField;
}

type MyComponentProps = ComponentProps & {
  fields: Fields;
};
\`\`\`

═══ COMPONENT STRUCTURE ═══════════════════════════════════
- Destructure params: \`const { RenderingIdentifier, styles } = params;\`
- Wrap in: \`<div className={\`component component-name \${styles}\`} id={RenderingIdentifier}>\`
- Add an inner: \`<div className="component-content">...</div>\`
- Always handle empty datasource with: \`<span className="is-empty-hint">Component Name</span>\`
- Return type is JSX.Element

Example:
\`\`\`tsx
export const Default = ({ params, fields }: MyComponentProps): JSX.Element => {
  const { RenderingIdentifier, styles } = params;

  return (
    <div className={\`component my-component \${styles}\`} id={RenderingIdentifier}>
      <div className="component-content">
        {fields ? (
          <>
            <Text field={fields.Title} />
            <ContentSdkImage field={fields.HeroImage} />
            <ContentSdkLink field={fields.CallToAction} />
          </>
        ) : (
          <span className="is-empty-hint">My Component</span>
        )}
      </div>
    </div>
  );
};
\`\`\`

═══ RENDERING HELPERS ═════════════════════════════════════
Use these for inline editing support:
- Single-Line Text / Multi-Line Text → <Text field={fields.X} />
- Rich Text → <ContentSdkRichText field={fields.X} />
- Image → <ContentSdkImage field={fields.X} />
- General Link → <ContentSdkLink field={fields.X} />
- Date → <DateField field={fields.X} />

═══ LIST COMPONENTS ═══════════════════════════════════════
For list components with a Treelist/Multilist "Items" field:
- Do NOT generate a separate rendering file for the child template.
- The parent component owns all rendering. Inside it, iterate over the Items array.
- For each item, render the child template's fields inline using the same rendering helpers (<Text />, <ContentSdkImage />, etc.).
- Define a ChildFields interface (or inline type) for the child item's fields.
- Example pattern:
\`\`\`tsx
// inside the parent component
interface NewsCardFields {
  CardImage: ImageField;
  ArticleTitle: Field<string>;
  PublishDate: Field<string>;
  ArticleLink: LinkField;
}

interface Fields {
  SectionTitle: Field<string>;
  Items: { fields: NewsCardFields }[];
}

// in JSX:
{fields.Items?.map((item, i) => (
  <div key={i} className="list-item">
    <ContentSdkImage field={item.fields.CardImage} />
    <Text field={item.fields.ArticleTitle} />
    <DateField field={item.fields.PublishDate} />
    <ContentSdkLink field={item.fields.ArticleLink} />
  </div>
))}
\`\`\`

IMPORTANT: Only generate files for parent/standalone components. Child templates are rendered inline by their parent.

═══ FILE / FOLDER STRUCTURE ════════════════════════════════
Each component lives in its own folder under src/components/.
Folder names use **lowercase-with-dashes** (kebab-case).
File names use **PascalCase**.

Examples:
- src/components/anniversary-banner/AnniversaryBanner.tsx
- src/components/anniversary-banner/anniversary-banner.props.ts  (when separate props file requested)
- src/components/promo-image/PromoImage.tsx

═══ OUTPUT FORMAT ═════════════════════════════════════════
Return ONLY code fenced in markdown code blocks. One block per file.
Start each block with the relative file path as a comment:
\`\`\`tsx
// src/components/anniversary-banner/AnniversaryBanner.tsx
...code...
\`\`\`

Return raw code only. No surrounding prose.

═══ DESIGN HINTS ══════════════════════════════════════════
Each component may include a "designHints" object captured from the original screenshot analysis.
These describe the visual appearance: layout, colors, typography, spacing, borders, shadows, etc.

When designHints are present, use them to make the generated code match the original design as closely as possible:
- If styling system is "tailwind": translate designHints into Tailwind utility classes (e.g. colors → bg-[#hex] text-[#hex], spacing → p-8 gap-6, borders → rounded-lg border, shadows → shadow-md, layout → flex/grid classes)
- If styling system is "bootstrap": translate into Bootstrap classes (e.g. layout → row/col, spacing → p-4 mb-3, shadows → shadow-sm)
- If styling system is "css-modules": generate CSS module rules with the exact colors, sizes, and spacing from designHints
- If styling system is "markup-only": use BEM class names that encode the intent (e.g. .hero-banner--dark-overlay, .card-grid--3-col) so a designer can implement them

Always prioritize translating the designHints faithfully. If a hint says "rounded-lg ~8px", use rounded-lg (Tailwind) or border-radius: 8px (CSS). If colors are given as hex values, use them directly.`;

/* ── Options interface ─────────────────────────────────────────── */

interface CodeGenOptions {
  separatePropsFile?: boolean;
  stylingSystem?: "tailwind" | "bootstrap" | "css-modules" | "markup-only";
}

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
  const model = request.headers.get("x-coding-model") || "gpt-5.3-codex";
  const isCodexModel = model.toLowerCase().includes("codex");

  const openai = new OpenAI({ apiKey });

  try {
    const body = await request.json();
    const { components, groups, options } = body;

    if (!components || !Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: "No components provided." },
        { status: 400 },
      );
    }

    /* Build a user prompt describing the templates */
    const userPrompt = buildUserPrompt(components, groups, options as CodeGenOptions);

    let code: string;
    let promptTokens = 0;
    let completionTokens = 0;
    const t0 = Date.now();

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
      promptTokens = response.usage?.input_tokens ?? 0;
      completionTokens = response.usage?.output_tokens ?? 0;
    } else {
      /* Chat models use the Chat Completions API */
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: sanitizeForPrompt(userPrompt) },
        ],
        max_completion_tokens: 8000,
        temperature: 0.2,
      });
      code = response.choices[0].message.content ?? "";
      promptTokens = response.usage?.prompt_tokens ?? 0;
      completionTokens = response.usage?.completion_tokens ?? 0;
    }
    const durationMs = Date.now() - t0;

    return NextResponse.json({
      success: true,
      code,
      model,
      metadata: {
        stepName: "generate-code",
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        durationMs,
        timestamp: new Date().toISOString(),
      },
    });
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
  options?: CodeGenOptions,
): string {
  const lines: string[] = [
    "Generate Next.js component code for the following Sitecore template definitions.",
    "",
  ];

  // Options
  if (options) {
    lines.push("CODE GENERATION OPTIONS:");
    if (options.separatePropsFile) {
      lines.push("- Put the Fields interface and Props type in a SEPARATE .props.ts file (e.g. my-component.props.ts). Import it in the component file.");
    } else {
      lines.push("- Keep the Fields interface and Props type INLINE in the component file.");
    }
    const styleMap: Record<string, string> = {
      tailwind: "Use Tailwind CSS utility classes for styling.",
      bootstrap: "Use Bootstrap CSS classes for styling.",
      "css-modules": "Use CSS Modules (.module.css) for styling. Generate the CSS module file as a separate code block.",
      "markup-only": "Use semantic HTML with BEM-style CSS class names only (no CSS framework). Do not generate CSS — just meaningful class names.",
    };
    lines.push(`- ${styleMap[options.stylingSystem ?? "markup-only"] ?? styleMap["markup-only"]}`);
    lines.push("");
  }

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
