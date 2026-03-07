"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface WizardStep {
  id: string;
  label: string;
}

interface WizardState {
  currentStepIndex: number;
  data: Record<string, unknown>;
}

interface WizardContextValue {
  steps: WizardStep[];
  currentStepIndex: number;
  currentStep: WizardStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  data: Record<string, unknown>;
  goNext: () => void;
  goBack: () => void;
  goTo: (index: number) => void;
  setStepData: (key: string, value: unknown) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

const STEPS: WizardStep[] = [
  { id: "tenant-selector", label: "Select Tenant And Site" },
  { id: "installation-wizard", label: "Installation" },
  { id: "component-input", label: "Component Input" },
  { id: "analysis-results", label: "Results" },
  { id: "create-structure", label: "Create Structure" },
  { id: "code-generation", label: "Code Generation" },
];

export function WizardProvider({
  children,
  initialStep = 0,
  initialData = {},
}: {
  children: ReactNode;
  initialStep?: number;
  initialData?: Record<string, unknown>;
}) {
  const [state, setState] = useState<WizardState>({
    currentStepIndex: initialStep,
    data: initialData,
  });

  const goNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.min(prev.currentStepIndex + 1, STEPS.length - 1),
    }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(prev.currentStepIndex - 1, 0),
    }));
  }, []);

  const goTo = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, Math.min(index, STEPS.length - 1)),
    }));
  }, []);

  const setStepData = useCallback((key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, [key]: value },
    }));
  }, []);

  const value = useMemo<WizardContextValue>(
    () => ({
      steps: STEPS,
      currentStepIndex: state.currentStepIndex,
      currentStep: STEPS[state.currentStepIndex],
      isFirstStep: state.currentStepIndex === 0,
      isLastStep: state.currentStepIndex === STEPS.length - 1,
      data: state.data,
      goNext,
      goBack,
      goTo,
      setStepData,
    }),
    [state, goNext, goBack, goTo, setStepData],
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
