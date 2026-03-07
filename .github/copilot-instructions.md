This is a **Sitecore Marketplace** application built with Next.js, React, and the Sitecore Marketplace SDK.

## Project Structure

- `src/components/ui/` — shadcn/Blok UI primitives only (do not place app-specific components here)
- `src/components/wizard/` — Wizard shell, steps, and app-specific components
- `src/components/providers/` — React context providers (Marketplace SDK, Tenant)
- `src/lib/` — Utilities, GraphQL layer, services, installation configs
- `src/app/api/` — Next.js API routes
- `.github/prompts/` — Reusable Copilot prompt templates

## Conventions

- Use `"use client"` directive for all interactive components.
- Import UI primitives from `@/components/ui/` (shadcn v4 with `@blok` registry namespace).
- Use the `AuthoringService` in `src/lib/services/` for all Sitecore GraphQL operations.
- OpenAI API keys are forwarded via the `x-openai-key` request header — never read from env in client code.
- Security compliance is tracked in `SECURITY_CHECKLIST.md`. Run the `security-review` prompt template for a full audit.
