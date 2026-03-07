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
import type { ItemConfig } from "@/lib/graphql/types";
import { DEV_COMPONENTS } from "./dev-data";
import { usePreflightNames } from "./use-preflight-names";
import { NameConflictAlert } from "./name-conflict-alert";
import { StepResultsCard } from "./step-results-card";

// Standard XM Cloud / JSS JSON rendering template
const JSON_RENDERING_TEMPLATE_ID = "{04646A89-996F-4EE7-878A-FFDBF1F0EF0D}";

export function RenderingStep() {
  const { data } = useWizard();
  const { siteSettings } = useSiteContext();
  const { authoringService, template, setRendering, advanceSubStep } = useStructure();

  const components = useMemo<AnalyzedComponent[]>(
    () =>
      (data.editedComponents as AnalyzedComponent[])?.length
        ? (data.editedComponents as AnalyzedComponent[])
        : DEV_COMPONENTS,
    [data.editedComponents],
  );

  const renderableComponents = useMemo(
    () => components.filter((c) => !c.isDatasourceFolder),
    [components],
  );

  const componentNames = useMemo(() => renderableComponents.map((c) => c.componentName), [renderableComponents]);

  const [parentId, setParentId] = useState(siteSettings?.RenderingsPath ?? "");
  const [selectedTreeItem, setSelectedTreeItem] = useState<SelectedTreeItem | null>(
    siteSettings?.renderingsItem
      ? { itemId: siteSettings.renderingsItem.itemId, name: siteSettings.renderingsItem.name, path: siteSettings.renderingsItem.path }
      : null,
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { preflightNames, preflightLoading } = usePreflightNames(parentId, componentNames, authoringService);

  const renamedComponents = preflightNames
    ? renderableComponents.filter((c) => preflightNames[c.componentName] !== c.componentName)
    : [];

  const handleCreate = useCallback(async () => {
    setRunning(true);
    setGlobalError(null);
    setResults([]);
    setRendering((prev) => ({ ...prev, state: { ...prev.state, status: "running", error: null } }));

    const partial: ItemResult[] = [];

    for (const comp of renderableComponents) {
      const resolvedName = preflightNames?.[comp.componentName] ?? comp.componentName;
      const config: ItemConfig = {
        name: resolvedName,
        templateId: JSON_RENDERING_TEMPLATE_ID,
        parentId,
        parentPath: selectedTreeItem?.path ?? "",
        language: "en",
        fields: [
          { name: "ComponentName", value: comp.componentName },
          {
            name: "Datasource Template",
            value: template.results.find((t) => t.originalName === comp.componentName)?.path ?? "",
          },
        ],
      };

      try {
        const item = await authoringService.createItem(config);
        if (!item) throw new Error("No item returned");
        partial.push({ originalName: comp.componentName, resolvedName, path: item.path, id: item.itemId, error: null });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Creation failed";
        partial.push({ originalName: comp.componentName, resolvedName, path: null, id: null, error: msg });
      }

      setResults([...partial]);
    }

    const hasErrors = partial.some((r) => r.error);
    setRendering({
      state: {
        status: hasErrors ? "error" : "done",
        createdIds: partial.filter((r) => r.id !== null).map((r) => r.id as string),
        error: hasErrors ? "Some renderings failed to create. See details below." : null,
      },
      results: partial,
    });

    if (!hasErrors) {
      advanceSubStep();
    }

    setRunning(false);
  }, [parentId, preflightNames, renderableComponents, authoringService, selectedTreeItem, advanceSubStep]);

  const isUnlocked = template.state.status === "done";
  const canRun = isUnlocked && !!parentId.trim() && !running && !preflightLoading;

  const buttonLabel = running
    ? "Creating renderings…"
    : preflightLoading
      ? "Checking names…"
      : results.length > 0
        ? "Retry"
        : `Create ${renderableComponents.length} Rendering(s)`;

  return (
    <div className="space-y-4">
      <ItemPickerInput
        id="renderings-parent-id"
        label="Renderings Folder"
        hint="Sitecore folder where JSON rendering items will be created."
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

      {!isUnlocked && (
        <Alert>
          <AlertDescription>
            Complete the <strong>Template</strong> step first.
          </AlertDescription>
        </Alert>
      )}

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
