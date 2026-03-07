import { buildMetadata, getCallerKey } from "../api-helpers";

/* ── getCallerKey ──────────────────────────────────────────────── */

describe("getCallerKey", () => {
  const makeRequest = (headers: Record<string, string>) =>
    ({ headers: { get: (k: string) => headers[k] ?? null } }) as never;

  it.each([
    [{ "x-forwarded-for": "1.2.3.4" }, "1.2.3.4"],
    [{ "x-real-ip": "5.6.7.8" }, "5.6.7.8"],
    [{ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" }, "1.2.3.4"],
    [{}, "anonymous"],
  ])("headers %j → %j", (headers, expected) => {
    expect(getCallerKey(makeRequest(headers))).toBe(expected);
  });
});

/* ── buildMetadata ─────────────────────────────────────────────── */

describe("buildMetadata", () => {
  it("builds metadata from chat completions usage", () => {
    const meta = buildMetadata("analyze", "gpt-4o", { prompt_tokens: 100, completion_tokens: 50 }, 1200);
    expect(meta).toMatchObject({
      stepName: "analyze",
      model: "gpt-4o",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      durationMs: 1200,
    });
    expect(meta.timestamp).toBeDefined();
  });

  it("builds metadata from responses API usage (input_tokens/output_tokens)", () => {
    const meta = buildMetadata("codegen", "codex-mini", { input_tokens: 200, output_tokens: 80 }, 900);
    expect(meta).toMatchObject({
      promptTokens: 200,
      completionTokens: 80,
      totalTokens: 280,
    });
  });

  it("handles null usage gracefully", () => {
    const meta = buildMetadata("step", "model", null, 500);
    expect(meta.promptTokens).toBe(0);
    expect(meta.completionTokens).toBe(0);
    expect(meta.totalTokens).toBe(0);
  });

  it("handles undefined usage gracefully", () => {
    const meta = buildMetadata("step", "model", undefined, 500);
    expect(meta.totalTokens).toBe(0);
  });
});
