"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import {
  type AiCallMetadata,
  type RunLog,
  createRunLog,
  addStep,
  finalizeRun,
} from "@/lib/services/logging-service";

/* ── Context shape ─────────────────────────────────────────────── */

interface RunLogContextValue {
  /** Start (or restart) a fresh run. Call when the analysis step begins. */
  startRun: (inputSource: RunLog["inputSource"]) => void;
  /** Append an AI-call step returned from an API route. */
  recordStep: (metadata: AiCallMetadata) => void;
  /** Mark the run as completed/failed and attach final artefacts. */
  finalize: (results: Parameters<typeof finalizeRun>[1]) => void;
  /** Read the current RunLog snapshot. */
  getRunLog: () => RunLog | null;
}

const RunLogContext = createContext<RunLogContextValue | null>(null);

/* ── Provider ──────────────────────────────────────────────────── */

export function RunLogProvider({ children }: { children: ReactNode }) {
  // Use a ref so mutations don't trigger re-renders across the tree.
  const runRef = useRef<RunLog | null>(null);

  const startRun = useCallback((inputSource: RunLog["inputSource"]) => {
    runRef.current = createRunLog(inputSource);
  }, []);

  const recordStep = useCallback((metadata: AiCallMetadata) => {
    if (!runRef.current) return;
    runRef.current = addStep(runRef.current, metadata);
  }, []);

  const finalize = useCallback((results: Parameters<typeof finalizeRun>[1]) => {
    if (!runRef.current) return;
    runRef.current = finalizeRun(runRef.current, results);
  }, []);

  const getRunLog = useCallback(() => runRef.current, []);

  return (
    <RunLogContext.Provider value={{ startRun, recordStep, finalize, getRunLog }}>
      {children}
    </RunLogContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────────────────── */

export function useRunLog(): RunLogContextValue {
  const ctx = useContext(RunLogContext);
  if (!ctx) {
    throw new Error("useRunLog must be used within a RunLogProvider");
  }
  return ctx;
}
