"use client";

import { useCallback, useMemo, useState } from "react";
import { useWizard } from "@/components/wizard/wizard-context";
import { useSiteContext } from "@/components/providers/site-provider";
import { useStructure, type ItemResult } from "./structure-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ItemPickerInput } from "@/components/wizard/item-picker-input";
import type { SelectedTreeItem } from "@/components/wizard/site-tree";
import type { AnalyzedComponent } from "@/lib/types/component";
import type { TemplateConfig } from "@/lib/graphql/types";
import { DEV_COMPONENTS } from "./dev-data";
import { usePreflightNames } from "./use-preflight-names";
import { NameConflictAlert } from "./name-conflict-alert";
import { StepResultsCard } from "./step-results-card";

export function TemplateStep() {
  const { data } = useWizard();
  const { siteSettings } = useSiteContext();
  const { authoringService, template, setTemplate, advanceSubStep } = useStructure();

  const components = useMemo<AnalyzedComponent[]>(
    () =>
      (data.editedComponents as AnalyzedComponent[])?.length
        ? (data.editedComponents as AnalyzedComponent[])
        : DEV_COMPONENTS,
    [data.editedComponents],
  );

  const templatesToCreate = useMemo(
    () => components.filter((c) => !c.isDatasourceFolder),
    [components],
  );

  const componentNames = useMemo(() => components.map((c) => c.componentName), [components]);

  const [parentId, setParentId] = useState(siteSettings?.Templates ?? "");
  const [selectedTreeItem, setSelectedTreeItem] = useState<SelectedTreeItem | null>(
    siteSettings?.templatesItem
      ? { itemId: siteSettings.templatesItem.itemId, name: siteSettings.templatesItem.name, path: siteSettings.templatesItem.path }
      : null,
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { preflightNames, preflightLoading } = usePreflightNames(parentId, componentNames, authoringService);

  const renamedComponents = preflightNames
    ? components.filter((c) => preflightNames[c.componentName] !== c.componentName)
    : [];

  const handleCreate = useCallback(async () => {
    setRunning(true);
    setGlobalError(null);
    setTemplate((prev) => ({ ...prev, state: { ...prev.state, status: "running", error: null } }));

    // On retry: carry over results that already succeeded so we don't duplicate them
    const previousResults = template.results;
    const partial: ItemResult[] = previousResults.filter((r) => r.id !== null);

    const alreadyDone = new Set(partial.map((r) => r.originalName));
    const pending = templatesToCreate.filter((c) => !alreadyDone.has(c.componentName));

    setResults([...partial]);

    for (const comp of pending) {
      const resolvedName = preflightNames?.[comp.componentName] ?? comp.componentName;
      const config: TemplateConfig = {
        name: resolvedName,
        parentId,
        parentPath: selectedTreeItem?.path ?? "",
        sections: [
          {
            name: "Data",
            fields: comp.fields.map((f) => ({
              name: f.name,
              displayName: f.displayName,
              type: f.type,
            })),
          },
        ],
      };

      try {
        const templateId = await authoringService.createTemplate(config);
        const path = selectedTreeItem?.path ? `${selectedTreeItem.path}/${resolvedName}` : null;
        partial.push({ originalName: comp.componentName, resolvedName, path, id: templateId, error: null });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Creation failed";
        partial.push({ originalName: comp.componentName, resolvedName, path: null, id: null, error: msg });
      }

      setResults([...partial]);
    }

    const hasErrors = partial.some((r) => r.error);
    setTemplate({
      state: {
        status: hasErrors ? "error" : "done",
        createdIds: partial.filter((r) => r.id !== null).map((r) => r.id as string),
        error: hasErrors ? "Some templates failed to create. See details below." : null,
      },
      results: partial,
    });

    if (!hasErrors) {
      advanceSubStep();
    }

    setRunning(false);
  }, [parentId, selectedTreeItem, preflightNames, templatesToCreate, template.results, authoringService, advanceSubStep]);

  const canRun = templatesToCreate.length > 0 && parentId.trim().length > 0 && !running && !preflightLoading;

  const buttonLabel = running
    ? "Creating templates…"
    : preflightLoading
      ? "Checking names…"
      : results.length > 0
        ? "Retry"
        : `Create ${templatesToCreate.length} Template(s)`;

  return (
    <div className="space-y-4">
      <ItemPickerInput
        id="templates-parent-id"
        label="Templates Folder"
        hint="Sitecore item ID of the folder where templates will be created."
        value={parentId}
        selectedItem={selectedTreeItem}
        onChange={(id) => {
          setParentId(id);
          setSelectedTreeItem(null);
        }}
        onSelect={(item) => {
          setParentId(item.itemId);
          setSelectedTreeItem(item);
        }}
      />

      <NameConflictAlert
        items={renamedComponents.map((c) => ({ original: c.componentName, resolved: preflightNames![c.componentName] }))}
      />

      {globalError && (
        <Alert variant="danger">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      <StepResultsCard results={results} />

      <Button onClick={handleCreate} disabled={!canRun} className="w-full">
        {buttonLabel}
      </Button>
    </div>
  );
}
