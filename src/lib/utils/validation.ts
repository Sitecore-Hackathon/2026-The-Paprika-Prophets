/**
 * Shared validation helpers for API routes.
 */

/** Allowed image MIME types for screenshot analysis. */
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/** Max image file size in bytes (10 MB). */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Max HTML body length in characters (500 KB). */
export const MAX_HTML_LENGTH = 500 * 1024;

/**
 * Validate an uploaded image file from FormData.
 *
 * @returns `null` if valid, or an error message string.
 */
export function validateImageFile(file: File | null): string | null {
  if (!file || !(file instanceof File)) {
    return "No image file provided.";
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `Invalid file type "${file.type}". Allowed types: ${[...ALLOWED_IMAGE_TYPES].join(", ")}.`;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${MAX_IMAGE_SIZE / 1024 / 1024} MB.`;
  }

  return null;
}

/**
 * Validate an HTML string for the HTML analysis endpoint.
 *
 * @returns `null` if valid, or an error message string.
 */
export function validateHtmlInput(html: unknown): string | null {
  if (typeof html !== "string" || html.trim().length === 0) {
    return "HTML content is required and must be a non-empty string.";
  }

  if (html.length > MAX_HTML_LENGTH) {
    return `HTML content too large (${(html.length / 1024).toFixed(0)} KB). Maximum allowed: ${MAX_HTML_LENGTH / 1024} KB.`;
  }

  return null;
}

/**
 * Strip common prompt-injection patterns from user-supplied text before
 * it is embedded in an LLM prompt. This is a defence-in-depth measure —
 * the system prompt boundary is the primary defence.
 *
 * Removes lines that look like jailbreak instructions, markdown role
 * overrides, and other well-known injection payloads.
 */
export function sanitizeForPrompt(input: string): string {
  // Remove lines that attempt to override system instructions
  const dangerousPatterns = [
    /^(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)/im,
    /^you\s+are\s+now\s+(a|an|the)\s+/im,
    /^(system|assistant|user)\s*:/im,
    /^<\|?(system|im_start|im_end)\|?>/im,
    /\bdo\s+not\s+follow\s+(any|your)\s+(previous|prior)\b/im,
    /\bact\s+as\s+(a|an|if)\b/im,
  ];

  const lines = input.split("\n");
  const filtered = lines.filter(
    (line) => !dangerousPatterns.some((p) => p.test(line.trim())),
  );

  return filtered.join("\n");
}
