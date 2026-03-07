"use client";

import Link from "next/link";
import { WizardProvider } from "@/components/wizard/wizard-context";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { TenantSelector } from "@/components/wizard/steps/tenant-selector";
import { InstallationWizard } from "@/components/wizard/steps/installation-wizard";
import { ComponentInput } from "@/components/wizard/steps/component-input";
import { AnalysisResults } from "@/components/wizard/steps/analysis-results";
import { CreateSitecoreStructure } from "@/components/wizard/steps/create-structure";
import { CodeGeneration } from "@/components/wizard/steps/code-generation";

export default function Home() {
  return (
    <WizardProvider>
      <WizardShell>
        <TenantSelector />
        <InstallationWizard />
        <ComponentInput />
        <AnalysisResults />
        <CreateSitecoreStructure />
        <CodeGeneration />
      </WizardShell>

      {/* Quick link to Code Generation POC */}
      <div className="fixed bottom-4 right-4">
        <Link
          href="/codegen"
          className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 border shadow-sm transition-colors"
        >
          ⚡ Code Generation POC
        </Link>
      </div>
    </WizardProvider>
  );
}
