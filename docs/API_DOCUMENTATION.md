# API Documentation — Component Forge

## Base URL

All API routes are served from the Next.js application under `/api/`.

---

## POST `/api/analyze-screenshot`

Analyses a screenshot image to identify Sitecore components and propose template structures.

### Request

- **Content-Type:** `multipart/form-data`
- **Headers:**
  | Header | Required | Description |
  |---|---|---|
  | `x-openai-key` | Yes* | OpenAI API key. Falls back to `OPENAI_API_KEY` env var if not provided. |

- **Body (FormData):**
  | Field | Type | Required | Constraints |
  |---|---|---|---|
  | `image` | File | Yes | Must be `image/png`, `image/jpeg`, `image/gif`, or `image/webp`. Max size: 10 MB. |

### Response

**200 OK**
```json
{
  "success": true,
  "analysis": {
    "components": [
      {
        "componentName": "HeroBanner",
        "description": "Full-width hero section",
        "visualLocation": "Top of page",
        "isListComponent": false,
        "childTemplateName": null,
        "isDatasourceFolder": false,
        "parentTemplateName": null,
        "fields": [
          {
            "name": "HeroTitle",
            "displayName": "Hero Title",
            "type": "Single-Line Text",
            "description": "Main heading text",
            "required": true
          }
        ],
        "variants": [{ "name": "Default", "description": "Standard layout" }],
        "sxaStyles": [],
        "suggestions": ""
      }
    ],
    "pageSuggestions": ""
  },
  "raw": "<raw JSON string from OpenAI>"
}
```

**400 Bad Request**
```json
{ "error": "Invalid file type \"application/pdf\". Allowed types: image/png, image/jpeg, image/gif, image/webp." }
```

**401 Unauthorized**
```json
{ "error": "No OpenAI API key provided. Please configure your key in Settings." }
```

**429 Too Many Requests**
```json
{ "error": "Too many requests. Please try again later." }
```
Headers: `Retry-After: <seconds>`

**500 Internal Server Error**
```json
{ "error": "<error message>" }
```

---

## POST `/api/analyze-html`

Analyses an HTML markup snippet to propose a Sitecore component template structure.

### Request

- **Content-Type:** `application/json`
- **Headers:**
  | Header | Required | Description |
  |---|---|---|
  | `x-openai-key` | Yes* | OpenAI API key. Falls back to `OPENAI_API_KEY` env var if not provided. |

- **Body (JSON):**
  | Field | Type | Required | Constraints |
  |---|---|---|---|
  | `html` | string | Yes | Non-empty string. Max length: 512,000 characters (~500 KB). |

### Response

**200 OK**
```json
{
  "success": true,
  "analysis": {
    "componentName": "ArticleCard",
    "description": "Card displaying an article preview",
    "fields": [
      {
        "name": "ArticleTitle",
        "displayName": "Article Title",
        "type": "Single-Line Text",
        "description": "Headline of the article",
        "required": true
      }
    ],
    "suggestions": "Consider adding a category field."
  },
  "raw": "<raw JSON string from OpenAI>"
}
```

**400 / 401 / 429 / 500** — Same structure as screenshot endpoint.

---

## Rate Limiting

Both endpoints enforce a sliding-window rate limit:
- **Limit:** 10 requests per 60-second window per caller IP.
- **Identification:** `x-forwarded-for` → `x-real-ip` → `"anonymous"`.
- **Storage:** In-memory (not shared across instances).
- **Response:** HTTP 429 with `Retry-After` header (seconds).

## Security

- Input validation: file type, file size, HTML length.
- Prompt injection sanitisation on HTML input.
- OpenAI API key never logged or echoed in responses.
- All external traffic over TLS.
- Security headers configured in `next.config.ts`.
