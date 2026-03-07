# AI Governance Policy — Component Forge

**Effective Date:** 2026-03-07

## 1. Purpose

This document defines how Component Forge uses artificial intelligence, what guardrails are in place, and how AI-generated output is handled.

## 2. AI Usage

| Aspect | Detail |
|---|---|
| **AI Provider** | OpenAI (GPT-4o) |
| **Usage** | Analysing screenshots and HTML markup to propose Sitecore component template structures |
| **Integration** | Server-side API routes (`/api/analyze-screenshot`, `/api/analyze-html`) |
| **Authentication** | User-supplied API key (BYOK model) |
| **Data sent to AI** | Screenshot images (base64) or HTML markup text |
| **Data received** | Structured JSON with component definitions, field types, and suggestions |

## 3. Responsible AI Principles

### 3.1 Transparency
- Users explicitly initiate AI analysis — the app never calls OpenAI without user action.
- Raw AI responses are shown alongside parsed results so users can verify output.
- The AI model name and version are configurable and visible in the Settings dialog.

### 3.2 Data Minimisation
- Only the minimum necessary data (the screenshot or HTML snippet) is sent.
- No conversation history is maintained — each analysis is a single-turn request.
- Images are not stored or logged.

### 3.3 Human Oversight
- AI-generated component structures are **proposals only** — they are not automatically applied to the Sitecore instance.
- Users review, modify, and approve all generated templates before any creation occurs.
- The application does not make autonomous decisions affecting the Sitecore content tree based on AI output.

### 3.4 Safety & Content Filtering
- OpenAI's built-in content filtering applies to all requests.
- User input is sanitised for prompt injection patterns before being embedded in prompts (see `src/lib/validation.ts`).
- System prompts use structured delimiters to separate instructions from user content.

## 4. Prompt Injection Defences

| Defence | Implementation |
|---|---|
| Input sanitisation | `sanitizeForPrompt()` strips known injection patterns (role overrides, system prompt escapes) |
| Structured prompts | Analysis prompts use clear section delimiters (`═══`) to separate instructions from user data |
| Output validation | Responses are parsed as JSON with `JSON.parse()` — non-JSON responses are rejected |
| `response_format` | OpenAI's `json_object` mode constrains output format |
| Single-turn | No conversation context to poison across requests |

## 5. Model Configuration

- **Default model:** `gpt-4o`
- **Configurable:** Via the Settings dialog (stored in Sitecore Settings item)
- **Max tokens:** 8000 (screenshot), 2000 (HTML) — prevents runaway costs
- **Temperature:** Default (not overridden) — balanced creativity/consistency

## 6. Cost Controls

- Rate limiting: 10 requests per minute per caller (in-memory sliding window)
- Max tokens capped per request type
- BYOK model: users provide their own API key, ensuring they control spend

## 7. Limitations & Disclaimers

- AI analysis may misidentify components or propose incorrect field types.
- Visual analysis quality depends on screenshot clarity and resolution.
- Complex or unusual layouts may produce incomplete results.
- The application does not guarantee that proposed structures follow Sitecore best practices in all cases.
- Users are responsible for reviewing and validating all AI-generated proposals.

## 8. Monitoring & Review

- This policy will be reviewed quarterly or whenever the AI integration changes materially.
- All changes to AI prompts or model configuration should be tracked in version control.
