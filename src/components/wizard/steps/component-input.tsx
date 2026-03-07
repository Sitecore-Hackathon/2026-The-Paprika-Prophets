"use client";

import { useWizard } from "../wizard-context";

export function ComponentInput() {
  const { goBack, setStepData } = useWizard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Component Input
        </h1>
        <p className="text-muted-foreground mt-1">
          Provide a screenshot, HTML, or other input to analyze with OpenAI.
        </p>
      </div>

      {/* TODO: Implement component input UI with OpenAI analysis */}
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        Component input — awaiting implementation
      </div>
    </div>
  );
}
