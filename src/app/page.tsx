"use client";

import { WizardProvider } from "@/components/wizard/wizard-context";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { TenantSelector } from "@/components/wizard/steps/tenant-selector";
import { InstallationWizard } from "@/components/wizard/steps/installation-wizard";
import { ComponentInput } from "@/components/wizard/steps/component-input";

export default function Home() {
  return (
    <WizardProvider>
      <WizardShell>
        <TenantSelector />
        <InstallationWizard />
        <ComponentInput />
      </WizardShell>
    </WizardProvider>
  );
}
