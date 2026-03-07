"use client";

import { useWizard } from "@/components/wizard/wizard-context";
import { StructureProvider, useStructure } from "./structure-context";
import { TemplateStep } from "./template-step";
import { RenderingStep } from "./rendering-step";
import { ExamplePageStep } from "./example-page-step";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/tailwind";

const SUB_STEPS = [
  { id: "template", label: "Template" },
  { id: "rendering", label: "Rendering" },
  { id: "page", label: "Example Page" },
] as const;

function statusColorScheme(status: string): "neutral" | "primary" | "success" | "danger" {
  switch (status) {
    case "running": return "primary";
    case "done": return "success";
    case "error": return "danger";
    default: return "neutral";
  }
}

function Inner() {
  const { goBack, goNext } = useWizard();
  const { activeSubStep, template, rendering, page } = useStructure();

  const stepStates = [template, rendering, page];

  const isSubStepUnlocked = (idx: number) => {
    if (idx === 0) return true;
    return stepStates[idx - 1].state.status === "done";
  };

  const allDone =
    template.state.status === "done" &&
    rendering.state.status === "done" &&
    page.state.status === "done";

  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Sitecore Structure
        </h1>
        <p className="text-muted-foreground mt-1">
          Create the template, rendering, and example page for each analyzed
          component.
        </p>
      </div>

      {/* Inner sub-step navigation */}
      <nav className="flex items-center gap-2">
        {SUB_STEPS.map((step, idx) => {
          const state = stepStates[idx];
          const unlocked = isSubStepUnlocked(idx);
          const active = activeSubStep === idx;

          return (
            <div key={step.id} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className={cn(
                    "h-px w-6",
                    stepStates[idx - 1].state.status === "done"
                      ? "bg-primary"
                      : "bg-muted-foreground/25",
                  )}
                />
              )}
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
                  active
                    ? "bg-foreground text-background"
                    : unlocked
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
                {state.state.status !== "idle" && (
                  <Badge colorScheme={statusColorScheme(state.state.status)} size="sm">
                    {state.state.status}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Active sub-step content */}
      <div className="min-h-[200px]">
        {activeSubStep === 0 && <TemplateStep />}
        {activeSubStep === 1 && <RenderingStep />}
        {activeSubStep === 2 && <ExamplePageStep />}
      </div>

      {/* Main wizard navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button onClick={goNext} disabled={!allDone}>
          Code Generation
        </Button>
      </div>
    </div>
  );
}

export function CreateSitecoreStructure() {
  return (
    <StructureProvider>
      <Inner />
    </StructureProvider>
  );
}
