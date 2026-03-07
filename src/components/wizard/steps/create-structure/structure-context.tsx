"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { useTenantContext } from "@/components/providers/tenant-provider";
import { AuthoringService } from "@/lib/services/authoring-service";

export type SubStepStatus = "idle" | "running" | "done" | "error";

export type SubStepState = {
  status: SubStepStatus;
  createdIds: string[];
  error: string | null;
};

export type ItemResult = {
  originalName: string;
  resolvedName: string;
  path: string | null;
  id: string | null;
  error: string | null;
};

export type StepSlot = {
  state: SubStepState;
  results: ItemResult[];
};

const idleState: SubStepState = { status: "idle", createdIds: [], error: null };
const idleSlot: StepSlot = { state: idleState, results: [] };

type StructureContextType = {
  authoringService: AuthoringService;
  activeSubStep: number;
  advanceSubStep: () => void;
  resetStructure: () => void;
  template: StepSlot;
  setTemplate: React.Dispatch<React.SetStateAction<StepSlot>>;
  rendering: StepSlot;
  setRendering: React.Dispatch<React.SetStateAction<StepSlot>>;
  page: StepSlot;
  setPage: React.Dispatch<React.SetStateAction<StepSlot>>;
};

const StructureContext = createContext<StructureContextType | undefined>(
  undefined,
);

export function StructureProvider({ children }: { children: ReactNode }) {
  const client = useMarketplaceClient();
  const { selectedTenant } = useTenantContext();

  const sitecoreContextId = selectedTenant?.context?.preview ?? "";

  const authoringService = useMemo(
    () => new AuthoringService(client, sitecoreContextId),
    [client, sitecoreContextId],
  );

  const [activeSubStep, setActiveSubStep] = useState(0);
  const [template, setTemplate] = useState<StepSlot>(idleSlot);
  const [rendering, setRendering] = useState<StepSlot>(idleSlot);
  const [page, setPage] = useState<StepSlot>(idleSlot);

  const advanceSubStep = useCallback(
    () => setActiveSubStep((n) => n + 1),
    [],
  );

  const resetStructure = useCallback(() => {
    setTemplate(idleSlot);
    setRendering(idleSlot);
    setPage(idleSlot);
    setActiveSubStep(0);
  }, []);

  const value = useMemo<StructureContextType>(
    () => ({
      authoringService,
      activeSubStep,
      advanceSubStep,
      resetStructure,
      template,
      setTemplate,
      rendering,
      setRendering,
      page,
      setPage,
    }),
    [authoringService, activeSubStep, advanceSubStep, resetStructure, template, rendering, page],
  );

  return (
    <StructureContext.Provider value={value}>
      {children}
    </StructureContext.Provider>
  );
}

export function useStructure(): StructureContextType {
  const ctx = useContext(StructureContext);
  if (!ctx) throw new Error("useStructure must be used within StructureProvider");
  return ctx;
}

export function useResetStructure() {
  const { resetStructure } = useStructure();
  return resetStructure;
}

