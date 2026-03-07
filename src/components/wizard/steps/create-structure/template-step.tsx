"use client";

import { useCallback, useMemo, useState } from "react";
import { useWizard } from "@/components/wizard/wizard-context";
import { useSiteContext } from "@/components/providers/site-provider";
import { useStructure, type ItemResult } from "./structure-context";
import { ErrorAlert } from "@/components/wizard/error-alert";
import { Button } from "@/components/ui/button";
import { ItemPickerInput } from "@/components/wizard/item-picker-input";
import type { SelectedTreeItem } from "@/components/wizard/site-tree";
import type { AnalyzedComponent, TemplateGroup } from "@/lib/types/component";
import { usePreflightNames } from "./use-preflight-names";
import { NameConflictAlert } from "./name-conflict-alert";
import { StepResultsCard } from "./step-results-card";
import { collectAllNames, countTemplates, processGroups } from "./utils/template-creation-service";

export const TemplateStep = () => {
  const { data } = useWizard();
  const { siteSettings } = useSiteContext();
  const { authoringService, template, setTemplate, advanceSubStep } = useStructure();

  const components = useMemo<AnalyzedComponent[]>(
    () => (data.editedComponents as AnalyzedComponent[]) ?? [],
    [data.editedComponents],
  );

  const groups = useMemo<TemplateGroup[]>(
    () => (data.templateGroups as TemplateGroup[]) ?? [],
    [data.templateGroups],
  );

  const allNames = useMemo(() => collectAllNames(groups, components), [groups, components]);
  const templateCount = useMemo(() => countTemplates(groups), [groups]);

  const [parentId, setParentId] = useState(siteSettings?.Templates ?? "");
  const [selectedTreeItem, setSelectedTreeItem] = useState<SelectedTreeItem | null>(
    siteSettings?.templatesItem ?? null,
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { preflightNames, preflightLoading } = usePreflightNames(parentId, allNames, authoringService);

  const renamedItems = preflightNames
    ? allNames
        .filter((n) => preflightNames[n] !== n)
        .map((n) => ({ original: n, resolved: preflightNames[n] }))
    : [];

  const handleCreate = useCallback(async () => {
    setRunning(true);
    setGlobalError(null);
    setTemplate((prev) => ({ ...prev, state: { ...prev.state, status: "running", error: null } }));

    const initial = template.results.filter((r) => r.id !== null);
    setResults(initial);

    const partial = await processGroups(
      authoringService,
      groups,
      components,
      parentId,
      selectedTreeItem?.path ?? "",
      preflightNames,
      initial,
      setResults,
    );

    const hasErrors = partial.some((r) => r.error);
    setTemplate({
      state: {
        status: hasErrors ? "error" : "done",
        createdIds: partial.filter((r) => r.id !== null).map((r) => r.id as string),
        error: hasErrors ? "Some items failed to create. See details below." : null,
      },
      results: partial,
    });

    if (!hasErrors) advanceSubStep();
    setRunning(false);
  }, [
    parentId,
    selectedTreeItem,
    preflightNames,
    groups,
    components,
    template.results,
    authoringService,
    advanceSubStep,
    setTemplate,
  ]);

  const canRun = groups.length > 0 && parentId.trim().length > 0 && !running && !preflightLoading;

  const buttonLabel = running
    ? "Creating templates…"
    : preflightLoading
      ? "Checking names…"
      : results.length > 0
        ? "Retry"
        : `Create ${templateCount} Template(s)`;

  return (
    <div className="space-y-4">
      <ItemPickerInput
        id="templates-parent-id"
        label="Templates Folder"
        hint="Sitecore item ID of the folder where templates will be created."
        required
        value={parentId}
        selectedItem={selectedTreeItem}
        onChange={(id) => { setParentId(id); setSelectedTreeItem(null); }}
        onSelect={(item) => { setParentId(item.itemId); setSelectedTreeItem(item); }}
      />

      <NameConflictAlert items={renamedItems} />

      <ErrorAlert error={globalError} />

      <StepResultsCard results={results} />

      <Button onClick={handleCreate} disabled={!canRun} className="w-full">
        {buttonLabel}
      </Button>
    </div>
  );
};
