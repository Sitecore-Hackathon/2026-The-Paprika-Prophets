import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";
import { validateImageFile } from "@/lib/validation";

const ANALYSIS_PROMPT = `You are a Sitecore XM Cloud expert analyzing a screenshot to identify components and propose template structures.

TASK: Analyze the provided screenshot and identify ALL distinct UI components visible.

═══════════════════════════════════════════════
STEP 1 — IDENTIFY VISUAL SECTIONS
═══════════════════════════════════════════════
Before proposing templates, mentally divide the screenshot into visual sections/regions. Each visually distinct area is typically its own component. Think about:
- Is this region independent and self-contained? → Component
- Does this region contain several visually similar repeated items? → List component
- Can this region be reused on other pages? → Component
- Is this a full-width section vs an embedded block? → Different components

COMMON VISUAL PATTERNS to recognize:
• HERO BANNER: Full-width or large block with background image, headline, subtext, CTA button
• NEWS / ARTICLE LIST: A section title + multiple cards/rows each with image + title + date + excerpt
• FEATURED / HIGHLIGHT CARD: A single large card with prominent image and overlay text (NOT a list)
• PROMO / CTA BANNER: A block with image, text, and a call-to-action — often dark or colorful background
• NAVIGATION: Top bar with logo, menu links, search
• FOOTER: Bottom section with links, copyright, social icons
• SIDEBAR WIDGET: Small block in a sidebar (recent posts, tags, categories)
• GRID / GALLERY: Multiple images or items in a grid layout (a list component)
• TESTIMONIAL SECTION: Quotes with author info (a list component)
• ACCORDION / FAQ: Expandable Q&A items (a list component)

═══════════════════════════════════════════════
STEP 2 — LIST vs STANDALONE
═══════════════════════════════════════════════
CRITICAL DISTINCTION:
• A LIST/REPEATER has 2+ visually similar items that share the same structure (e.g. 3 news cards, 4 team members).
  → Always produce THREE templates: Parent (container), Child (single item), Folder (shared data folder).
• A STANDALONE component appears once and has its own unique layout (e.g. a hero, a single CTA banner, a single featured article).
  → Produce ONE template.

For LIST COMPONENTS (reusable-item pattern):
- PARENT template: isListComponent=true, holds section-level fields (section heading, description, "View All" link, etc.)
  IMPORTANT: The parent MUST include an "Items" field of type Treelist (or Multilist) that references child items.
  This allows the same child items to be reused across different list components.
  If the section has a visible heading like "Trending News", "Our Team", that heading is a field on the PARENT (e.g. "SectionTitle" of type Single-Line Text).
  Set childTemplateName to the child template name.
- CHILD template: holds fields for ONE repeated item. Set parentTemplateName to the parent name.
  The child is stored in a shared data folder and referenced via the parent's Items field.
- FOLDER template: isDatasourceFolder=true, no data fields — a shared container for child items.
  Set parentTemplateName referencing the list parent.
  Insert options on this folder allow creating child items inside it.

For STANDALONE COMPONENTS:
- isListComponent=false, childTemplateName=null, isDatasourceFolder=false, parentTemplateName=null

═══════════════════════════════════════════════
STEP 3 — FIELDS FOR EACH TEMPLATE
═══════════════════════════════════════════════
For each piece of visible content in the component, create a field:
- Text that could change per instance → Single-Line Text or Multi-Line Text or Rich Text
- An image → Image
- A clickable link/button → General Link
- A date label → Date or Datetime
- A category/tag label → Single-Line Text (or Droplink if you think it comes from a shared list)
- A toggle/flag → Checkbox
- A numeric value → Integer or Number

FIELD NAME RULES:
- "name" must ALWAYS be PascalCase with no spaces (e.g. "HeroTitle", "BackgroundImage", "ArticleDate").
- "displayName" is the human-friendly label (e.g. "Hero Title", "Background Image", "Article Date").
- Don't over-abstract: Use clear, specific names like "ArticleTitle" not just "Title" when the template represents a specific thing.

COMMON MISTAKES to avoid:
✗ Putting the section heading on the CHILD template — section headings belong on the PARENT
✗ Missing the CTA link on the child item (e.g. "Read More" or the entire card being clickable)
✗ Missing image alt-text — if there's an image, consider if it needs a separate alt text field
✗ Forgetting author/source on article cards
✗ Marking a single featured/hero block as a list when it appears only once

═══════════════════════════════════════════════
STEP 4 — VARIANTS AND SXA STYLES
═══════════════════════════════════════════════
Look for visual differences between instances of the SAME logical component:
- VARIANT = structurally different HTML (e.g. a card with image-on-top vs a card with image-on-left — different DOM layout)
- STYLE = CSS-level difference only (e.g. dark vs light background, left vs center alignment, with/without border)
If you see only one instance of a component, still add a "Default" variant.

═══════════════════════════════════════════════
STEP 5 — JSON OUTPUT
═══════════════════════════════════════════════
Return your response as JSON with this structure:
{
  "components": [
    {
      "componentName": "PascalCaseName (e.g. TrendingNewsList)",
      "description": "Brief purpose description",
      "visualLocation": "Where on the screenshot (e.g. Left half of the page, Top banner, Bottom right sidebar)",
      "isListComponent": false,
      "childTemplateName": null,
      "isDatasourceFolder": false,
      "parentTemplateName": null,
      "fields": [
        {
          "name": "FieldNameInPascalCase",
          "displayName": "Field Display Name",
          "type": "Single-Line Text|Multi-Line Text|Rich Text|Image|General Link|Date|Datetime|Checkbox|Integer|Number|Treelist|Multilist|Droplink|Droptree|File|Name Value List",
          "description": "Purpose of this field",
          "required": true
        }
      ],
      "variants": [
        { "name": "Default", "description": "Standard appearance" }
      ],
      "sxaStyles": [
        { "name": "StyleName", "options": ["Option1", "Option2"], "description": "What this style controls" }
      ],
      "suggestions": "Additional notes for this component, e.g. rendering logic, content author tips"
    }
  ],
  "pageSuggestions": "Overall page structure commentary"
}

═══════════════════════════════════════════════
WORKED EXAMPLE (for reference, do NOT copy)
═══════════════════════════════════════════════
Imagine a screenshot with: a "Latest News" section (heading + 3 news cards each with image, title, date, excerpt) and a "Membership Promo" hero on the right with large background image, category tag, date, and headline.

Expected output would have 4 components:
1. LatestNewsList (isListComponent=true, childTemplateName="NewsCard") — fields: SectionTitle (Single-Line Text), ViewAllLink (General Link), Items (Treelist — references NewsCard items)
2. NewsCard (parentTemplateName="LatestNewsList") — fields: CardImage (Image), ArticleTitle (Single-Line Text), PublishDate (Date), Excerpt (Multi-Line Text), ArticleLink (General Link), Author (Single-Line Text)
3. NewsCardsFolder (isDatasourceFolder=true, parentTemplateName="LatestNewsList") — no data fields. Insert options: NewsCard. Content editors create NewsCard items here, then reference them from any LatestNewsList via the Items field.
4. MembershipPromo (standalone) — fields: BackgroundImage (Image), CategoryTag (Single-Line Text), PromoDate (Date), Headline (Single-Line Text), CallToActionLink (General Link)

Notice: "Latest News" heading → field on the parent, NOT on the child. The Items field on the parent references child items — the same NewsCard can be used in multiple lists. The promo is standalone, NOT part of the list.

═══════════════════════════════════════════════
FINAL CHECKLIST before returning:
═══════════════════════════════════════════════
□ Every visible text element maps to a field
□ Every image maps to an Image field
□ Every clickable element maps to a General Link field
□ Section headings are on the PARENT, not the child
□ List parents have an "Items" field of type Treelist or Multilist referencing child items
□ List components have exactly 3 entries (parent + child + folder)
□ Standalone components are NOT marked as lists
□ All field names are PascalCase with no spaces
□ FieldName names are specific (ArticleTitle not Title, when appropriate)
□ Variants and styles are listed (at minimum "Default" variant)
□ visualLocation is descriptive enough to locate the component on the screenshot`;

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
    let prompt = ANALYSIS_PROMPT;
    if (feedback) {
      prompt += `\n\n═══════════════════════════════════════════════\nREANALYSIS INSTRUCTIONS\n═══════════════════════════════════════════════\nThe user reviewed a previous analysis and has the following feedback.\nAdjust your analysis accordingly while still following all rules above.\n\nPrevious result:\n${previousResult}\n\nUser feedback:\n${feedback}`;
    }

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
      max_tokens: 8000,
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
