"use client";

import { useWizard } from "./wizard-context";
import { TenantSiteHeader } from "./tenant-site-header";
import { useTenantContext } from "@/components/providers/tenant-provider";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export function WizardShell({ children }: { children: React.ReactNode[] }) {
  const { steps, currentStepIndex, goTo } = useWizard();
  const { selectedTenant } = useTenantContext();

  useEffect(() => {
    if (!selectedTenant && currentStepIndex !== 0) {
      goTo(0);
    }
  }, [selectedTenant, currentStepIndex, goTo]);

  return (
    <div className="flex flex-col h-full min-h-screen">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4 flex items-center gap-6">
          <span className="text-base font-bold tracking-tight whitespace-nowrap text-foreground">
            Component Forge
          </span>

          <div className="h-5 w-px bg-border" />

          <div className="flex items-center gap-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-px w-6",
                      index <= currentStepIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/25",
                    )}
                  />
                )}
                <button
                  className="flex items-center gap-1.5 disabled:cursor-default"
                  onClick={() => process.env.NODE_ENV === "development" && goTo(index)}
                  disabled={process.env.NODE_ENV !== "development"}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      index === currentStepIndex
                        ? "bg-foreground text-background"
                        : index < currentStepIndex
                          ? "bg-foreground/20 text-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      index === currentStepIndex
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </nav>

      <TenantSiteHeader />

      <main className="flex-1 flex flex-col container mx-auto px-6 py-8 max-w-4xl">
        {children[currentStepIndex]}
      </main>
    </div>
  );
}
