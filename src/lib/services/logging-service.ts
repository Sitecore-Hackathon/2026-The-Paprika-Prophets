/**
 * Logging service — collects AI call metadata on the client side and
 * persists Run + RunStep items to Sitecore via the Authoring API.
 *
 * Flow:
 *   1. API routes return `AiCallMetadata` alongside their normal response.
 *   2. Client accumulates metadata into a `RunLog` via `createRunLog()` / `addStep()`.
 *   3. At the end of the wizard, call `saveRunToSitecore()` to persist.
 */

import type { AuthoringService } from "./authoring-service";
import { SITECORE_PATHS } from "@/lib/installation/constants";
import { DEFAULT_LANGUAGE } from "@/lib/constants";

/* ── Types ─────────────────────────────────────────────────────── */

/** Metadata returned by each API route alongside its normal response. */
export type AiCallMetadata = {
  stepName: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  timestamp: string; // ISO 8601
};

/** A single step within a run — mirrors the RunStep Sitecore template. */
export type RunStep = {
  stepName: string;
  stepOrder: number;
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
};

/** A full run — mirrors the Run Sitecore template. */
export type RunLog = {
  runId: string;
  runDate: string;
  runStatus: "in-progress" | "completed" | "failed" | "partial";
  userName: string;
  inputSource: "screenshot" | "html" | "manual";
  generatedCode: string;
  totalTokensUsed: number;
  totalDuration: number;
  componentCount: number;
  steps: RunStep[];
};

/* ── Factory ───────────────────────────────────────────────────── */

/** Create a new empty RunLog. */
export const createRunLog = (
  inputSource: RunLog["inputSource"],
  userName: string = "unknown",
): RunLog => ({
  runId: crypto.randomUUID(),
  runDate: new Date().toISOString(),
  runStatus: "in-progress",
  userName,
  inputSource,
  generatedCode: "",
  totalTokensUsed: 0,
  totalDuration: 0,
  componentCount: 0,
  steps: [],
});

/* ── Accumulation helpers ──────────────────────────────────────── */

/** Add an AI call step to the run log and update totals. */
export const addStep = (run: RunLog, metadata: AiCallMetadata): RunLog => {
  const step: RunStep = {
    stepName: metadata.stepName,
    stepOrder: run.steps.length + 1,
    timestamp: metadata.timestamp,
    model: metadata.model,
    promptTokens: metadata.promptTokens,
    completionTokens: metadata.completionTokens,
    totalTokens: metadata.totalTokens,
    durationMs: metadata.durationMs,
  };

  return {
    ...run,
    totalTokensUsed: run.totalTokensUsed + metadata.totalTokens,
    totalDuration: run.totalDuration + metadata.durationMs,
    steps: [...run.steps, step],
  };
};

/** Mark the run as completed and attach final results. */
export const finalizeRun = (
  run: RunLog,
  results: {
    generatedCode?: string;
    componentCount?: number;
    status?: RunLog["runStatus"];
  },
): RunLog => ({
  ...run,
  runStatus: results.status ?? "completed",
  generatedCode: results.generatedCode ?? run.generatedCode,
  componentCount: results.componentCount ?? run.componentCount,
});

/* ── Sitecore persistence ──────────────────────────────────────── */

const LOGS_PATH = SITECORE_PATHS.MODULE.LOGS;

/**
 * Persist a RunLog to Sitecore as a Run item with RunStep children.
 * Requires the AuthoringService (client-side, built-in auth).
 *
 * Creates:
 *   /sitecore/system/Modules/Component Forge/Logs/Run-<id>
 *     /01-<stepName>
 *     /02-<stepName>
 *     ...
 */
export const saveRunToSitecore = async (
  authoring: AuthoringService,
  run: RunLog,
  templateIds: { runTemplateId: string; runStepTemplateId: string },
): Promise<{ success: boolean; runItemId?: string; error?: string }> => {
  try {
    // 1. Create the Run item
    const runName = `Run-${run.runDate.slice(0, 19).replace(/[T:]/g, "-")}`;
    const logsFolder = await authoring.getItem(LOGS_PATH);
    if (!logsFolder) {
      return { success: false, error: "Logs folder not found at " + LOGS_PATH };
    }

    const runItem = await authoring.createItem({
      name: runName,
      templateId: templateIds.runTemplateId,
      parentId: logsFolder.itemId,
      parentPath: LOGS_PATH,
      language: DEFAULT_LANGUAGE,
      fields: [
        { name: "RunId", value: run.runId },
        { name: "RunDate", value: toSitecoreDatetime(run.runDate) },
        { name: "RunStatus", value: run.runStatus },
        { name: "UserName", value: run.userName },
        { name: "InputSource", value: run.inputSource },
        { name: "GeneratedCode", value: truncateForSitecore(run.generatedCode) },
        { name: "TotalTokensUsed", value: String(run.totalTokensUsed) },
        { name: "TotalDuration", value: String(run.totalDuration) },
        { name: "ComponentCount", value: String(run.componentCount) },
      ],
    });

    if (!runItem) {
      return { success: false, error: "Failed to create Run item" };
    }

    // 2. Create RunStep children
    for (const step of run.steps) {
      const stepName = `${String(step.stepOrder).padStart(2, "0")}-${step.stepName}`;
      await authoring.createItem({
        name: stepName,
        templateId: templateIds.runStepTemplateId,
        parentId: runItem.itemId,
        parentPath: runItem.path,
        language: DEFAULT_LANGUAGE,
        fields: [
          { name: "StepName", value: step.stepName },
          { name: "StepOrder", value: String(step.stepOrder) },
          { name: "Timestamp", value: toSitecoreDatetime(step.timestamp) },
          { name: "Model", value: step.model },
          { name: "PromptTokens", value: String(step.promptTokens) },
          { name: "CompletionTokens", value: String(step.completionTokens) },
          { name: "TotalTokens", value: String(step.totalTokens) },
          { name: "Duration", value: String(step.durationMs) },
        ],
      });
    }

    return { success: true, runItemId: runItem.itemId };
  } catch (err) {
    console.error("[logging-service] saveRunToSitecore failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/* ── Utilities ─────────────────────────────────────────────────── */

/** Convert ISO 8601 to Sitecore Datetime format: 20260307T193914Z */
function toSitecoreDatetime(iso: string): string {
  return iso.replace(/[-:.]/g, "").replace(/(\d{8}T\d{6}).*/, "$1Z");
}

/** Truncate large text to avoid GraphQL payload issues. */
function truncateForSitecore(text: string, maxLength: number = 50_000): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\n\n[truncated]";
}

/** Export the full RunLog as a downloadable JSON blob URL. */
export const exportRunAsJson = (run: RunLog): string => {
  const blob = new Blob([JSON.stringify(run, null, 2)], {
    type: "application/json",
  });
  return URL.createObjectURL(blob);
};
