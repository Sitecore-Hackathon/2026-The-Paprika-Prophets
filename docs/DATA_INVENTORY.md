# Data Inventory — Component Forge

## Purpose

This document catalogues all data collected, processed, transmitted, or stored by the Component Forge application.

## Data Flow Diagram

```
User (Sitecore iframe)
  │
  ├─ Screenshot / HTML markup
  │     ↓
  │  Next.js API Route (in-memory)
  │     │
  │     ├─ Sanitised & validated
  │     ↓
  │  OpenAI GPT-4o API
  │     │
  │     ↓
  │  JSON analysis response
  │     ↓
  └─ Displayed in browser (not persisted)

  ├─ OpenAI API Key
  │     ↓
  │  Sitecore Settings Item (/sitecore/content/Component Forge/Settings)
  │     • Stored in Sitecore content tree
  │     • Read via GraphQL on each request
  │     • Forwarded to API route via x-openai-key header

  ├─ Tenant Context
  │     ↓
  │  Marketplace SDK session (browser memory)
  │     • Not persisted
```

## Data Inventory Table

| # | Data Element | Classification | Source | Destination | Storage | Retention | Encryption |
|---|---|---|---|---|---|---|---|
| 1 | Screenshot image | User Content | User upload/paste | OpenAI API | None (in-memory) | Request lifecycle | TLS in transit |
| 2 | HTML markup | User Content | User input | OpenAI API | None (in-memory) | Request lifecycle | TLS in transit |
| 3 | OpenAI API key | Secret/Credential | User entry | Sitecore DB, OpenAI API | Sitecore content tree | Until user removes | Sitecore DB encryption + TLS |
| 4 | LLM model preferences (Analysis + Coding) | Configuration | User selection | Sitecore DB | Sitecore content tree | Until user removes | Sitecore DB encryption |
| 5 | Tenant ID / Context ID | Session Context | Marketplace SDK | Next.js app | Browser memory | Session only | N/A |
| 6 | Analysis results (JSON) | Generated Content | OpenAI API response | Browser display | None (in-memory) | Page session | TLS in transit |
| 7 | Caller IP (rate limiting) | Operational | Request headers | In-memory rate limiter | Node.js memory | 60-second sliding window | N/A |

## Data Residency

- **Application hosting:** Determined by Vercel / deployment target region.
- **OpenAI processing:** Data is processed by OpenAI in accordance with their [API data usage policy](https://openai.com/policies/api-data-usage-policies).
- **Sitecore content tree:** Same region as the customer's XM Cloud instance.

## Data Deletion

| Scenario | Action |
|---|---|
| User closes browser/tab | Session data (tenant context, analysis results) is discarded |
| App uninstall via Marketplace | All Sitecore items (templates, settings, folders) are removed by the uninstallation service |
| Manual cleanup | Delete `/sitecore/content/Component Forge` node via Content Editor |
