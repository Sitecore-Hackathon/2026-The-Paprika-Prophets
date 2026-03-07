import {
  createRunLog,
  addStep,
  finalizeRun,
  type AiCallMetadata,
  type RunLog,
} from "../logging-service";

/* ── helpers ───────────────────────────────────────────────────── */

const fakeMeta = (overrides: Partial<AiCallMetadata> = {}): AiCallMetadata => ({
  stepName: "test-step",
  model: "gpt-4o",
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  durationMs: 1200,
  timestamp: new Date().toISOString(),
  ...overrides,
});

/* ── createRunLog ──────────────────────────────────────────────── */

describe("createRunLog", () => {
  it.each<[RunLog["inputSource"]]>([
    ["screenshot"],
    ["html"],
    ["manual"],
  ])("creates a run with inputSource=%j", (source) => {
    const run = createRunLog(source, "testuser");
    expect(run.inputSource).toBe(source);
    expect(run.userName).toBe("testuser");
    expect(run.runStatus).toBe("in-progress");
    expect(run.steps).toHaveLength(0);
    expect(run.totalTokensUsed).toBe(0);
    expect(run.totalDuration).toBe(0);
    expect(run.runId).toBeDefined();
  });

  it("defaults userName to 'unknown'", () => {
    const run = createRunLog("screenshot");
    expect(run.userName).toBe("unknown");
  });
});

/* ── addStep ───────────────────────────────────────────────────── */

describe("addStep", () => {
  it("appends a step and updates totals", () => {
    const run = createRunLog("html");
    const updated = addStep(run, fakeMeta({ totalTokens: 150, durationMs: 1000 }));

    expect(updated.steps).toHaveLength(1);
    expect(updated.steps[0].stepOrder).toBe(1);
    expect(updated.totalTokensUsed).toBe(150);
    expect(updated.totalDuration).toBe(1000);
  });

  it("accumulates across multiple steps", () => {
    let run = createRunLog("screenshot");
    run = addStep(run, fakeMeta({ totalTokens: 100, durationMs: 500 }));
    run = addStep(run, fakeMeta({ totalTokens: 200, durationMs: 700 }));
    run = addStep(run, fakeMeta({ totalTokens: 50, durationMs: 300 }));

    expect(run.steps).toHaveLength(3);
    expect(run.steps[2].stepOrder).toBe(3);
    expect(run.totalTokensUsed).toBe(350);
    expect(run.totalDuration).toBe(1500);
  });

  it("does not mutate the original run", () => {
    const run = createRunLog("manual");
    const updated = addStep(run, fakeMeta());
    expect(run.steps).toHaveLength(0);
    expect(updated.steps).toHaveLength(1);
  });
});

/* ── finalizeRun ───────────────────────────────────────────────── */

describe("finalizeRun", () => {
  it.each<[RunLog["runStatus"]]>([
    ["completed"],
    ["failed"],
    ["partial"],
  ])("sets status to %j", (status) => {
    const run = createRunLog("screenshot");
    const result = finalizeRun(run, { status });
    expect(result.runStatus).toBe(status);
  });

  it("defaults status to 'completed'", () => {
    const run = createRunLog("html");
    const result = finalizeRun(run, {});
    expect(result.runStatus).toBe("completed");
  });

  it("attaches generatedCode and componentCount", () => {
    const run = createRunLog("screenshot");
    const result = finalizeRun(run, {
      generatedCode: "const x = 1;",
      componentCount: 3,
    });
    expect(result.generatedCode).toBe("const x = 1;");
    expect(result.componentCount).toBe(3);
  });

  it("does not mutate the original run", () => {
    const run = createRunLog("html");
    const result = finalizeRun(run, { status: "completed", componentCount: 5 });
    expect(run.runStatus).toBe("in-progress");
    expect(result.runStatus).toBe("completed");
  });
});
