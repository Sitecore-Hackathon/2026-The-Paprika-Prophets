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
import type { TemplateConfig } from "@/lib/types/graphql";
import type { AuthoringService } from "@/lib/services/authoring-service";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { usePreflightNames } from "./use-preflight-names";
import { NameConflictAlert } from "./name-conflict-alert";
import { StepResultsCard } from "./step-results-card";

/** Common/Folder base template for datasource folder items. */
const COMMON_FOLDER_TEMPLATE_ID = "{A87A00B1-E6DB-45AB-8B54-636FEC3B5523}";

/** Creation order within a group — folders must be last so they can reference earlier template IDs. */
const ROLE_ORDER: Record<string, number> = {
  child: 0,
  standalone: 0,
  parent: 1,
  folder: 2,
};

function sortedMembers(group: TemplateGroup) {
  return [...group.members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99),
  );
}

function collectAllNames(groups: TemplateGroup[], components: AnalyzedComponent[]): string[] {
  return groups.flatMap((g) =>
    g.members.map((m) => components[m.idx]?.componentName).filter(Boolean) as string[],
  );
}

function countTemplates(groups: TemplateGroup[]): number {
  return groups.reduce(
    (acc, g) => acc + g.members.filter((m) => m.role !== "folder").length,
    0,
  );
}

function buildFolderConfig(name: string, parentId: string, parentPath: string): TemplateConfig {
  return {
    name,
    parentId,
    parentPath,
    sections: [],
    baseTemplateIds: [COMMON_FOLDER_TEMPLATE_ID],
    createStandardValuesItem: true,
  };
}

function buildDataTemplateConfig(
  name: string,
  comp: AnalyzedComponent,
  parentId: string,
  parentPath: string,
): TemplateConfig {
  return {
    name,
    parentId,
    parentPath,
    sections: [
      {
        name: "Data",
        fields: comp.fields.map((f) => ({
          name: f.name,
          displayName: f.displayName,
          type: f.type,
          ...(f.source ? { source: f.source } : {}),
        })),
      },
    ],
    createStandardValuesItem: true,
  };
}

async function createFolderMember(
  svc: AuthoringService,
  group: TemplateGroup,
  comp: AnalyzedComponent,
  resolvedName: string,
  parentId: string,
  parentPath: string,
  partial: ItemResult[],
): Promise<ItemResult> {
  // Folder insert options point to: parent (list) or standalone (standalone)
  const insertRole = group.type === "list" ? "parent" : "standalone";
  const insertTemplateId = partial.find((r) => r.groupId === group.id && r.role === insertRole)?.id ?? "";

  try {
    const config = buildFolderConfig(resolvedName, parentId, parentPath);
    const { templateId, standardValuesItemId } = await svc.createTemplate(config);

    if (insertTemplateId && standardValuesItemId) {
      await svc.updateItemFields(standardValuesItemId, DEFAULT_LANGUAGE, [
        { name: "__Masters", value: insertTemplateId },
      ]);
    }

    return {
      groupId: group.id,
      role: "folder",
      originalName: comp.componentName,
      resolvedName,
      path: parentPath ? `${parentPath}/${resolvedName}` : null,
      id: templateId,
      error: null,
    };
  } catch (err) {
    return {
      groupId: group.id,
      role: "folder",
      originalName: comp.componentName,
      resolvedName,
      path: null,
      id: null,
      error: err instanceof Error ? err.message : "Folder creation failed",
    };
  }
}

async function createDataTemplateMember(
  svc: AuthoringService,
  group: TemplateGroup,
  member: TemplateGroup["members"][number],
  comp: AnalyzedComponent,
  resolvedName: string,
  parentId: string,
  parentPath: string,
  partial: ItemResult[],
): Promise<ItemResult> {
  try {
    const config = buildDataTemplateConfig(resolvedName, comp, parentId, parentPath);
    const { templateId, standardValuesItemId } = await svc.createTemplate(config);

    // List-group parents: insert options → child template
    if (member.role === "parent" && standardValuesItemId) {
      const childTemplateId = partial.find(
        (r) => r.groupId === group.id && r.role === "child",
      )?.id;
      if (childTemplateId) {
        await svc.updateItemFields(standardValuesItemId, DEFAULT_LANGUAGE, [
          { name: "__Masters", value: childTemplateId },
        ]);
      }
    }

    return {
      groupId: group.id,
      role: member.role,
      originalName: comp.componentName,
      resolvedName,
      path: parentPath ? `${parentPath}/${resolvedName}` : null,
      id: templateId,
      error: null,
    };
  } catch (err) {
    return {
      groupId: group.id,
      role: member.role,
      originalName: comp.componentName,
      resolvedName,
      path: null,
      id: null,
      error: err instanceof Error ? err.message : "Creation failed",
    };
  }
}

async function processGroups(
  svc: AuthoringService,
  groups: TemplateGroup[],
  components: AnalyzedComponent[],
  parentId: string,
  parentPath: string,
  preflightNames: Record<string, string> | null,
  initial: ItemResult[],
  onProgress: (results: ItemResult[]) => void,
): Promise<ItemResult[]> {
  const partial: ItemResult[] = [...initial];
  const alreadyDone = new Set(partial.map((r) => r.originalName));

  for (const group of groups) {
    for (const member of sortedMembers(group)) {
      const comp = components[member.idx];
      if (!comp || alreadyDone.has(comp.componentName)) continue;

      const resolvedName = preflightNames?.[comp.componentName] ?? comp.componentName;

      const result =
        member.role === "folder"
          ? await createFolderMember(svc, group, comp, resolvedName, parentId, parentPath, partial)
          : await createDataTemplateMember(svc, group, member, comp, resolvedName, parentId, parentPath, partial);

      partial.push(result);
      onProgress([...partial]);
    }
  }

  return partial;
}

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
