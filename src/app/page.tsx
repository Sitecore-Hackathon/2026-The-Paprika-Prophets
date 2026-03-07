"use client";

import { WizardProvider } from "@/components/wizard/wizard-context";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { TenantSelector } from "@/components/wizard/steps/tenant-selector";
import { InstallationWizard } from "@/components/wizard/steps/installation-wizard";
import { ComponentInput } from "@/components/wizard/steps/component-input";
import { AnalysisResults } from "@/components/wizard/steps/analysis-results";
import { CreateSitecoreStructure } from "@/components/wizard/steps/create-structure";

export default function Home() {
  return (
    <WizardProvider>
      <WizardShell>
        <TenantSelector />
        <InstallationWizard />
        <ComponentInput />
        <AnalysisResults />
        <CreateSitecoreStructure />
      </WizardShell>
    </WizardProvider>
  );
}
