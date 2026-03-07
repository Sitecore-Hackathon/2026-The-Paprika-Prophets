export const DEFAULT_LANGUAGE = "en";

export const DATABASE = {
  MASTER: "master",
  WEB: "web",
} as const;

/* ── Default AI model identifiers ──────────────────────────────── */

export const DEFAULT_ANALYSIS_MODEL = "gpt-5-mini";
export const DEFAULT_CODING_MODEL = "gpt-5.3-codex";

/* ── Custom HTTP header names used between client and API routes ─ */

export const HEADERS = {
  OPENAI_KEY: "x-openai-key",
  TENANT_ID: "x-tenant-id",
  ANALYSIS_MODEL: "x-analysis-model",
  CODING_MODEL: "x-coding-model",
} as const;

/* ── Well-known Sitecore template IDs ──────────────────────────── */

export const WELL_KNOWN_TEMPLATES = {
  /** Common/Folder base template used for datasource folder items. */
  COMMON_FOLDER: "{A87A00B1-E6DB-45AB-8B54-636FEC3B5523}",
  /** Standard JSON rendering template (JSS). */
  JSON_RENDERING: "{04646A89-996F-4EE7-878A-FFDBF1F0EF0D}",
} as const;

/* ── Default page placeholder key ──────────────────────────────── */

export const DEFAULT_PLACEHOLDER = "headless-main";
