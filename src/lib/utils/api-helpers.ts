/**
 * Shared helpers for Next.js API routes.
 * Extracts the repeated rate-limit check, API-key resolution,
 * and error-response patterns so each route stays focused on its business logic.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/utils/rate-limit";
import type { AiCallMetadata } from "@/lib/services/logging-service";

/* ── Types ─────────────────────────────────────────────────────── */

export type RouteGuardResult =
  | { ok: true; openai: OpenAI; apiKey: string }
  | { ok: false; response: NextResponse };

/* ── Caller key extraction ─────────────────────────────────────── */

export const getCallerKey = (request: NextRequest): string =>
  request.headers.get("x-forwarded-for") ??
  request.headers.get("x-real-ip") ??
  "anonymous";

/* ── Combined rate-limit + API-key guard ───────────────────────── */

/**
 * Run rate-limiting and API-key validation in one call.
 * Returns either a ready-to-use OpenAI client or a pre-built error response.
 */
export const guardRoute = (
  request: NextRequest,
  bucketPrefix: string,
  limit = 10,
  windowMs = 60_000,
): RouteGuardResult => {
  const callerKey = getCallerKey(request);
  const rl = rateLimit(`${bucketPrefix}:${callerKey}`, limit, windowMs);

  if (!rl.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        },
      ),
    };
  }

  const apiKey =
    request.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No OpenAI API key provided. Please configure your key in Settings." },
        { status: 401 },
      ),
    };
  }

  return { ok: true, openai: new OpenAI({ apiKey }), apiKey };
};

/* ── Metadata builder ──────────────────────────────────────────── */

/** Build an `AiCallMetadata` object from OpenAI usage stats. */
export const buildMetadata = (
  stepName: string,
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number } | null | undefined,
  durationMs: number,
): AiCallMetadata => ({
  stepName,
  model,
  promptTokens: usage?.prompt_tokens ?? usage?.input_tokens ?? 0,
  completionTokens: usage?.completion_tokens ?? usage?.output_tokens ?? 0,
  totalTokens:
    (usage?.prompt_tokens ?? usage?.input_tokens ?? 0) +
    (usage?.completion_tokens ?? usage?.output_tokens ?? 0),
  durationMs,
  timestamp: new Date().toISOString(),
});

/* ── Error response ────────────────────────────────────────────── */

export const errorResponse = (error: unknown, fallbackMessage: string, status = 500): NextResponse => {
  const message = error instanceof Error ? error.message : fallbackMessage;
  console.error(`${fallbackMessage}:`, error);
  return NextResponse.json({ error: message }, { status });
};
