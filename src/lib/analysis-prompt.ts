/**
 * Shared analysis prompt sections used by both the screenshot and HTML
 * analysis API routes. Keeping them here ensures the two prompts stay in
 * sync — every rule, example, and checklist item lives in one place.
 */

/* ── Reusable prompt sections ──────────────────────────────────── */

const COMMON_VISUAL_PATTERNS = `
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
• ACCORDION / FAQ: Expandable Q&A items (a list component)`;

const LIST_VS_STANDALONE = `CRITICAL DISTINCTION:
• A LIST/REPEATER has 2+ visually similar items that share the same structure (e.g. 3 news cards, 4 team members).
  → Always produce FOUR templates: Parent + Parent Folder + Child + Child Folder.
• A STANDALONE component appears once and has its own unique layout (e.g. a hero, a single CTA banner, a single featured article).
  → Produce TWO templates: the component template + its datasource folder.

EVERY component template (standalone, list parent, OR list child) MUST have its own dedicated datasource folder template.

For LIST COMPONENTS (reusable-item pattern):
- PARENT template: isListComponent=true, holds section-level fields (section heading, description, "View All" link, etc.)
  IMPORTANT: The parent MUST include an "Items" field of type Treelist (or Multilist) that references child items.
  This allows the same child items to be reused across different list components.
  If the section has a visible heading like "Trending News", "Our Team", that heading is a field on the PARENT (e.g. "SectionTitle" of type Single-Line Text).
  Set childTemplateName to the child template name.
- PARENT FOLDER template: isDatasourceFolder=true, no data fields — stores datasource items for the parent component.
  Set parentTemplateName referencing the list parent.
  Insert options on this folder allow creating parent datasource items inside it.
- CHILD template: holds fields for ONE repeated item. Set parentTemplateName to the parent name.
  The child is stored in a shared data folder and referenced via the parent's Items field.
- CHILD FOLDER template: isDatasourceFolder=true, no data fields — a shared container for child items.
  Set parentTemplateName referencing the child template name.
  Insert options on this folder allow creating child items inside it.

For STANDALONE COMPONENTS:
- isListComponent=false, childTemplateName=null, isDatasourceFolder=false, parentTemplateName=null
- IMPORTANT: Every standalone component needs a datasource folder for its datasource items.
  → Produce TWO entries: the component template + a folder (isDatasourceFolder=true).`;

const FIELD_RULES = `For each piece of visible content in the component, create a field:
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
✗ Marking a single featured/hero block as a list when it appears only once`;



const JSON_SCHEMA = `Return your response as JSON with this structure:
{
  "components": [
    {
      "componentName": "PascalCaseName (e.g. TrendingNewsList)",
      "description": "Brief purpose description",
      "visualLocation": "Where on the page (e.g. Left half of the page, Top banner, Bottom right sidebar)",
      "isListComponent": false,
      "childTemplateName": null,
      "isDatasourceFolder": false,
      "parentTemplateName": null,
      "fields": [
        {
          "name": "FieldNameInPascalCase",
          "displayName": "Field Display Name",
          "type": "Single-Line Text|Multi-Line Text|Rich Text|Image|General Link|Date|Datetime|Checkbox|Integer|Number|Treelist|Multilist|Droplink|Droptree|File|Name Value List",
          "description": "Purpose of this field"
        }
      ],
      "suggestions": "Additional notes for this component, e.g. rendering logic, content author tips"
    }
  ],
  "pageSuggestions": "Overall page structure commentary"
}`;

const WORKED_EXAMPLE = `Imagine a page with: a "Latest News" section (heading + 3 news cards each with image, title, date, excerpt) and a "Membership Promo" hero on the right with large background image, category tag, date, and headline.

Expected output would have 6 components:
1. LatestNewsList (isListComponent=true, childTemplateName="NewsCard") — fields: SectionTitle (Single-Line Text), ViewAllLink (General Link), Items (Treelist — references NewsCard items)
2. LatestNewsListFolder (isDatasourceFolder=true, parentTemplateName="LatestNewsList") — no data fields. Stores datasource items for the LatestNewsList parent component. Insert options: LatestNewsList.
3. NewsCard (parentTemplateName="LatestNewsList") — fields: CardImage (Image), ArticleTitle (Single-Line Text), PublishDate (Date), Excerpt (Multi-Line Text), ArticleLink (General Link), Author (Single-Line Text)
4. NewsCardsFolder (isDatasourceFolder=true, parentTemplateName="NewsCard") — no data fields. Insert options: NewsCard. Content editors create NewsCard items here, then reference them from any LatestNewsList via the Items field.
5. MembershipPromo (standalone) — fields: BackgroundImage (Image), CategoryTag (Single-Line Text), PromoDate (Date), Headline (Single-Line Text), CallToActionLink (General Link)
6. MembershipPromoFolder (isDatasourceFolder=true, parentTemplateName="MembershipPromo") — no data fields. Stores MembershipPromo datasource items.

Notice: "Latest News" heading → field on the parent, NOT on the child. The Items field on the parent references child items — the same NewsCard can be used in multiple lists. The promo is standalone, NOT part of the list. EVERY component template has its own datasource folder — the list parent (LatestNewsListFolder), the list child (NewsCardsFolder), and the standalone (MembershipPromoFolder).`;

const FINAL_CHECKLIST = `□ Every visible text element maps to a field
□ Every image maps to an Image field
□ Every clickable element maps to a General Link field
□ Section headings are on the PARENT, not the child
□ List parents have an "Items" field of type Treelist or Multilist referencing child items
□ List components have exactly 4 entries (parent + parent folder + child + child folder)
□ Standalone components have 2 entries (template + folder)
□ EVERY component template has its own dedicated datasource folder (isDatasourceFolder=true)
□ All field names are PascalCase with no spaces
□ FieldName names are specific (ArticleTitle not Title, when appropriate)
□ visualLocation is descriptive enough to locate the component`;

/* ── Assembled prompts ─────────────────────────────────────────── */

export const SCREENSHOT_ANALYSIS_PROMPT = `You are a Sitecore XM Cloud expert analyzing a screenshot to identify components and propose template structures.

TASK: Analyze the provided screenshot and identify ALL distinct UI components visible.

═══════════════════════════════════════════════
STEP 1 — IDENTIFY VISUAL SECTIONS
═══════════════════════════════════════════════
Before proposing templates, mentally divide the screenshot into visual sections/regions. Each visually distinct area is typically its own component. Think about:
- Is this region independent and self-contained? → Component
- Does this region contain several visually similar repeated items? → List component
- Can this region be reused on other pages? → Component
- Is this a full-width section vs an embedded block? → Different components
${COMMON_VISUAL_PATTERNS}

═══════════════════════════════════════════════
STEP 2 — LIST vs STANDALONE
═══════════════════════════════════════════════
${LIST_VS_STANDALONE}

═══════════════════════════════════════════════
STEP 3 — FIELDS FOR EACH TEMPLATE
═══════════════════════════════════════════════
${FIELD_RULES}

═══════════════════════════════════════════════
STEP 4 — JSON OUTPUT
═══════════════════════════════════════════════
${JSON_SCHEMA}

═══════════════════════════════════════════════
WORKED EXAMPLE (for reference, do NOT copy)
═══════════════════════════════════════════════
${WORKED_EXAMPLE}

═══════════════════════════════════════════════
FINAL CHECKLIST before returning:
═══════════════════════════════════════════════
${FINAL_CHECKLIST}`;


export const HTML_ANALYSIS_PROMPT = `You are a Sitecore XM Cloud expert analyzing HTML markup to propose Sitecore template structures.

TASK: Analyze the provided HTML and identify ALL distinct UI components.

═══════════════════════════════════════════════
STEP 1 — IDENTIFY COMPONENTS
═══════════════════════════════════════════════
Examine the HTML structure and identify every distinct component block.
A single HTML snippet may describe ONE standalone component OR a LIST (repeater) with parent + child.
${COMMON_VISUAL_PATTERNS}

═══════════════════════════════════════════════
STEP 2 — LIST vs STANDALONE
═══════════════════════════════════════════════
${LIST_VS_STANDALONE}

═══════════════════════════════════════════════
STEP 3 — EXTRACT FIELDS
═══════════════════════════════════════════════
${FIELD_RULES}

HTML-specific field hints:
• <img> src → Image field
• <a href> → General Link field
• <time> or date-like text → Date field
• Content inside <p>, <h1>–<h6>, <span> → Text fields (choose appropriate type)

═══════════════════════════════════════════════
STEP 4 — JSON OUTPUT
═══════════════════════════════════════════════
${JSON_SCHEMA}

═══════════════════════════════════════════════
WORKED EXAMPLE (for reference, do NOT copy)
═══════════════════════════════════════════════
${WORKED_EXAMPLE}

═══════════════════════════════════════════════
FINAL CHECKLIST before returning:
═══════════════════════════════════════════════
${FINAL_CHECKLIST}`;
