"use client";

import { useCallback, useMemo, useState } from "react";
import { useWizard } from "@/components/wizard/wizard-context";
import { useSiteContext } from "@/components/providers/site-provider";
import { useStructure, type ItemResult } from "./structure-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ItemPickerInput } from "@/components/wizard/item-picker-input";
import type { SelectedTreeItem } from "@/components/wizard/site-tree";
import type { AnalyzedComponent, TemplateGroup } from "@/lib/types/component";
import type { ItemConfig } from "@/lib/graphql/types";
import { usePreflightNames } from "./use-preflight-names";
import { NameConflictAlert } from "./name-conflict-alert";
import { StepResultsCard } from "./step-results-card";

// Standard XM Cloud / JSS JSON rendering template
const JSON_RENDERING_TEMPLATE_ID = "{04646A89-996F-4EE7-878A-FFDBF1F0EF0D}";

export function RenderingStep() {
  const { data } = useWizard();
  const { siteSettings } = useSiteContext();
  const { authoringService, template, rendering, setRendering, advanceSubStep } = useStructure();

  const components = useMemo<AnalyzedComponent[]>(
    () => (data.editedComponents as AnalyzedComponent[]) ?? [],
    [data.editedComponents],
  );

  const groups = useMemo<TemplateGroup[]>(
    () => (data.templateGroups as TemplateGroup[]) ?? [],
    [data.templateGroups],
  );

  // For renderings, only the primary member per group (standalone or parent)
  const renderableMembers = useMemo(
    () =>
      groups.flatMap((group) => {
        const primaryRole = group.type === "list" ? "parent" : "standalone";
        const member = group.members.find((m) => m.role === primaryRole);
        if (!member) return [];
        const comp = components[member.idx];
        if (!comp) return [];
        return [{ group, member, comp }];
      }),
    [groups, components],
  );

  const componentNames = useMemo(
    () => renderableMembers.map((item) => item.comp.componentName),
    [renderableMembers],
  );

  const [parentId, setParentId] = useState(siteSettings?.RenderingsPath ?? "");
  const [selectedTreeItem, setSelectedTreeItem] = useState<SelectedTreeItem | null>(
    siteSettings?.renderingsItem ?? null,
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { preflightNames, preflightLoading } = usePreflightNames(parentId, componentNames, authoringService);

  const renamedItems = preflightNames
    ? renderableMembers
        .filter((item) => preflightNames[item.comp.componentName] !== item.comp.componentName)
        .map((item) => ({
          original: item.comp.componentName,
          resolved: preflightNames[item.comp.componentName],
        }))
    : [];

  const handleCreate = useCallback(async () => {
    setRunning(true);
    setGlobalError(null);
    setRendering((prev) => ({ ...prev, state: { ...prev.state, status: "running", error: null } }));

    // On retry: carry over results that already succeeded so we don't duplicate them
    const previousResults = rendering.results;
    const partial: ItemResult[] = previousResults.filter((r) => r.id !== null);
    const alreadyDone = new Set(partial.map((r) => r.originalName));

    setResults([...partial]);

    for (const { group, member, comp } of renderableMembers) {
      if (alreadyDone.has(comp.componentName)) continue;

      const resolvedName = preflightNames?.[comp.componentName] ?? comp.componentName;

      // Find the matching template result for this group's primary member
      const templateResult = template.results.find(
        (t) => t.groupId === group.id && (t.role === "standalone" || t.role === "parent"),
      );

      // Find the folder result for this group to build the Datasource Location query
      const folderResult = template.results.find(
        (t) => t.groupId === group.id && t.role === "folder",
      );
      const folderId = folderResult?.id ?? "";
      const datasourceLocation = folderId   
        ? `query:$site/Data/*[@@templateid='${folderId}']|query:$sharedSites/Data/*[@@templateid='${folderId}']`
        : "";

      const config: ItemConfig = {
        name: resolvedName,
        templateId: JSON_RENDERING_TEMPLATE_ID,
        parentId,
        parentPath: selectedTreeItem?.path ?? "",
        language: "en",
        fields: [
          { name: "ComponentName", value: comp.componentName },
          { name: "Datasource Template", value: templateResult?.path ?? "" },
          { name: "Datasource Location", value: datasourceLocation },
        ],
      };

      try {
        const item = await authoringService.createItem(config);
        if (!item) throw new Error("No item returned");
        partial.push({
          groupId: group.id,
          role: member.role,
          originalName: comp.componentName,
          resolvedName,
          path: item.path,
          id: item.itemId,
          error: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Creation failed";
        partial.push({
          groupId: group.id,
          role: member.role,
          originalName: comp.componentName,
          resolvedName,
          path: null,
          id: null,
          error: msg,
        });
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
  }, [
    parentId,
    selectedTreeItem,
    preflightNames,
    renderableMembers,
    authoringService,
    rendering.results,
    template.results,
    advanceSubStep,
    setRendering,
  ]);

  const isUnlocked = template.state.status === "done";
  const canRun = isUnlocked && !!parentId.trim() && !running && !preflightLoading;

  const buttonLabel = running
    ? "Creating renderings"
    : preflightLoading
      ? "Checking names"
      : results.length > 0
        ? "Retry"
        : `Create ${renderableMembers.length} Rendering(s)`;

  return (
    <div className="space-y-4">
      <ItemPickerInput
        id="renderings-parent-id"
        label="Renderings Folder"
        hint="Sitecore folder where JSON rendering items will be created."
        required
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

      <NameConflictAlert items={renamedItems} />

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
