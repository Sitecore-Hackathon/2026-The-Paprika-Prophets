# Privacy Policy — Component Forge

**Effective Date:** 2026-03-07
**Last Updated:** 2026-03-07

## 1. Overview

Component Forge is a Sitecore Marketplace application that analyses screenshots and HTML markup using OpenAI's GPT-4o API to propose SitecoreAI component template structures. This policy describes data handling within the application.

## 2. Data We Process

| Data Category | Source | Purpose | Retention |
|---|---|---|---|
| **Screenshots** | User upload / clipboard paste | Sent to OpenAI for component analysis | In-memory only; not persisted after response |
| **HTML Markup** | User-provided text | Sent to OpenAI for component analysis | In-memory only; not persisted after response |
| **OpenAI API Key** | Stored in Sitecore Settings item | Authenticating to OpenAI API | Stored in Sitecore content tree; encrypted at rest by Sitecore |
| **Tenant Context** | Sitecore Marketplace SDK | Identifying the target SitecoreAI instance | Session-scoped; not stored |

## 3. Third-Party Data Sharing

- **OpenAI API** — Screenshots and HTML markup are sent to OpenAI for analysis. See [OpenAI's Data Usage Policy](https://openai.com/policies/api-data-usage-policies). When using the API, OpenAI does **not** use submitted data for training.
- No other third-party services receive user data.

## 4. Data Storage

- Component Forge does **not** maintain its own database or persistent storage.
- All analysis inputs (images, HTML) are processed in-memory and discarded after the OpenAI response is returned.
- Configuration data (API keys, model preferences) is stored in the Sitecore content tree under the `/sitecore/content/Component Forge/Settings` item.

## 5. Data Minimisation

- Only the minimum data needed for analysis is sent to OpenAI.
- Screenshots are not resized or stored — they are base64-encoded, sent, and immediately garbage collected.
- HTML markup is sanitized to remove prompt-injection patterns before being sent.

## 6. User Rights

Since Component Forge does not persist user data, there is no stored personal data to access, correct, or delete. Users can:
- Clear browser state (cookies, local storage) at any time.
- Remove the Settings item from Sitecore to delete stored API keys.
- Uninstall the application via the Marketplace to remove all Sitecore content items.

## 7. Contact

For privacy inquiries, contact the development team via the GitHub repository's Issues page.
