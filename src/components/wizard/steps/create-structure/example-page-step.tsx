"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWizard } from "@/components/wizard/wizard-context";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { useSiteContext } from "@/components/providers/site-provider";
import { useTenantContext } from "@/components/providers/tenant-provider";
import { useStructure } from "./structure-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemPickerInput } from "@/components/wizard/item-picker-input";
import type { SelectedTreeItem } from "@/components/wizard/site-tree";
import { createPage, addComponentOnPage, updateComponentContent } from "@/lib/services/agent-service";
import type { AuthoringService } from "@/lib/services/authoring-service";
import { generateDummyFieldValue } from "@/lib/dummy-fields";
import type { AnalyzedComponent, TemplateGroup } from "@/lib/types/component";
import type { ItemResult } from "./structure-context";
import { DEV_COMPONENTS, DEV_GROUPS } from "./dev-data";
import { usePreflightNames } from "./use-preflight-names";
import { NameConflictAlert } from "./name-conflict-alert";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

/* ── Constants ─────────────────────────────────────────────────────── */

const CHILD_ITEM_COUNT = 3;
/** Field types that hold pipe-separated item IDs (multivalue references). */
const MULTIVALUE_FIELD_TYPES = new Set(["Treelist", "Multilist"]);

/* ── Types ──────────────────────────────────────────────────────────── */

type ComponentPlacement = {
  componentName: string;
  componentId: string | null;
  datasourceId: string | null;
  /** IDs of child items created under the parent datasource (list components only). */
  childIds: string[];
  error: string | null;
};

type PageResult = {
  pageId: string;
  placements: ComponentPlacement[];
};

/* ── Helpers ────────────────────────────────────────────────────────── */

/**
 * Creates CHILD_ITEM_COUNT child items under parentDatasourceId,
 * populates each with dummy field values, then writes their IDs
 * to the parent's multivalue reference field.
 * Returns the array of created child item IDs.
 */
async function createChildItems(
  svc: AuthoringService,
  client: ClientSDK,
  sitecoreContextId: string,
  parentDatasourceId: string,
  parentComp: AnalyzedComponent,
  childComp: AnalyzedComponent,
  childTemplateId: string,
  language: string,
): Promise<string[]> {
  const childIds: string[] = [];

  for (let i = 0; i < CHILD_ITEM_COUNT; i++) {
    const item = await svc.createItem({
      name: `${childComp.componentName} ${i + 1}`,
      templateId: childTemplateId,
      parentId: parentDatasourceId,
      parentPath: "",
      language,
    });
    if (!item?.itemId) throw new Error(`Child item ${i + 1} returned no ID`);
    childIds.push(item.itemId);

    const dummyFields = Object.fromEntries(
      childComp.fields.map((f) => [f.name, generateDummyFieldValue(f.type, language)]),
    );
    await updateComponentContent(client, sitecoreContextId, item.itemId, dummyFields, language);
  }

  // Write created child IDs to the parent datasource's multivalue reference field
  const refField = parentComp.fields.find((f) => MULTIVALUE_FIELD_TYPES.has(f.type));
  if (refField && childIds.length > 0) {
    await updateComponentContent(
      client,
      sitecoreContextId,
      parentDatasourceId,
      { [refField.name]: childIds.join("|") },
      language,
    );
  }

  return childIds;
}

/* ── Component ──────────────────────────────────────────────────────── */

export function ExamplePageStep() {
  const { data } = useWizard();
  const { siteDetails, siteSettings } = useSiteContext();
  const client = useMarketplaceClient();
  const { selectedTenant } = useTenantContext();
  const sitecoreContextId = selectedTenant?.context?.preview ?? "";
  const { authoringService, template, rendering, page, setPage } = useStructure();

  const components = useMemo<AnalyzedComponent[]>(
    () =>
      (data.editedComponents as AnalyzedComponent[])?.length
        ? (data.editedComponents as AnalyzedComponent[])
        : DEV_COMPONENTS,
    [data.editedComponents],
  );

  const groups = useMemo<TemplateGroup[]>(
    () =>
      (data.templateGroups as TemplateGroup[])?.length
        ? (data.templateGroups as TemplateGroup[])
        : DEV_GROUPS,
    [data.templateGroups],
  );

  const defaultPageLocation = siteDetails?.page_locations?.[0] ?? null;
  const routeTemplate = siteSettings?.routeBaseTemplateItem ?? null;
  const defaultTemplateId = siteSettings?.RouteBaseTemplate ?? "";

  const [parentId, setParentId] = useState(defaultPageLocation?.itemId ?? "");
  const [selectedTreeItem, setSelectedTreeItem] = useState<SelectedTreeItem | null>(
    defaultPageLocation
      ? {
          itemId: defaultPageLocation.itemId,
          name: defaultPageLocation.path.split("/").filter(Boolean).at(-1) ?? "Page Location",
          path: defaultPageLocation.path,
        }
      : null,
  );
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [selectedTemplateItem, setSelectedTemplateItem] = useState<SelectedTreeItem | null>(
    routeTemplate ?? null,
  );
  const [pageName, setPageName] = useState(`${components[0]?.componentName || "Example"}`);
  const [placeholder, setPlaceholder] = useState("headless-main");
  const [language, setLanguage] = useState("en");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [debouncedPageName, setDebouncedPageName] = useState(pageName);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedPageName(pageName), 400);
    return () => clearTimeout(id);
  }, [pageName]);

  const preflightInputName = debouncedPageName.trim();
  const preflightInputNames = useMemo(
    () => (preflightInputName ? [preflightInputName] : []),
    [preflightInputName],
  );
  const { preflightNames, preflightLoading } = usePreflightNames(parentId, preflightInputNames, authoringService);
  const preflightName = preflightInputName ? (preflightNames?.[preflightInputName] ?? null) : null;
  const isRenamed = preflightName !== null && preflightName !== preflightInputName;

  const handleCreate = useCallback(async () => {
    if (!parentId.trim() || !templateId.trim()) {
      setError("Page location or template not available.");
      return;
    }
    if (!pageName.trim()) {
      setError("Page name cannot be empty.");
      return;
    }

    setRunning(true);
    setError(null);
    setPage((prev) => ({ ...prev, state: { ...prev.state, status: "running", error: null } }));

    const resolvedName = preflightName ?? (preflightInputName || pageName.trim());
    const lang = language || "en";

    // On retry: reuse the already-created page
    const existingPageId = page.state.createdIds[0] ?? null;
    let pageId: string;

    if (existingPageId) {
      pageId = existingPageId;
    } else {
      setResult(null);
      try {
        const pageResponse = await createPage(client, sitecoreContextId, {
          parentId,
          templateId,
          name: resolvedName,
          language: lang,
        });
        pageId = pageResponse.itemId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Page creation failed";
        setError(msg);
        setPage({ state: { status: "error", createdIds: [], error: msg }, results: [] });
        setRunning(false);
        return;
      }
    }

    // On retry: carry over successful placements
    const previousPlacements = result?.placements ?? [];
    const partialPlacements: ComponentPlacement[] = previousPlacements.filter((p) => p.error === null);
    const alreadyPlaced = new Set(partialPlacements.map((p) => p.componentName));

    // Iterate only renderings that were actually created (parent + standalone roles only)
    const pendingRenderings = rendering.results.filter((r) => !alreadyPlaced.has(r.originalName));

    setResult({ pageId, placements: [...partialPlacements] });

    for (const renderingResult of pendingRenderings) {
      const comp = components.find((c) => c.componentName === renderingResult.originalName);
      if (!comp) continue;

      if (!renderingResult.id) {
        partialPlacements.push({ componentName: comp.componentName, componentId: null, datasourceId: null, childIds: [], error: "Rendering item was not created" });
        setResult({ pageId, placements: [...partialPlacements] });
        continue;
      }

      let componentId: string | null = null;
      let datasourceId: string | null = null;

      try {
        const addResponse = await addComponentOnPage(client, sitecoreContextId, {
          pageId,
          componentRenderingId: renderingResult.id,
          placeholderPath: placeholder,
          componentItemName: comp.componentName,
          language: lang,
        });
        componentId = addResponse.componentId;
        datasourceId = addResponse.datasourceId ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Add component failed";
        partialPlacements.push({ componentName: comp.componentName, componentId: null, datasourceId: null, childIds: [], error: msg });
        setResult({ pageId, placements: [...partialPlacements] });
        continue;
      }

      // Populate parent datasource with dummy field values
      if (datasourceId) {
        const initialFields = Object.fromEntries(
          comp.fields.map((f) => [f.name, generateDummyFieldValue(f.type, lang)]),
        );
        try {
          await updateComponentContent(client, sitecoreContextId, datasourceId, initialFields, lang);
        } catch {
          partialPlacements.push({ componentName: comp.componentName, componentId, datasourceId, childIds: [], error: "Component added but content update failed" });
          setResult({ pageId, placements: [...partialPlacements] });
          continue;
        }
      }

      // For list groups: create child items and link them to the parent datasource
      let childIds: string[] = [];
      if (renderingResult.role === "parent" && datasourceId) {
        const group = groups.find((g) => g.id === renderingResult.groupId);
        const childMemberIdx = group?.members.find((m) => m.role === "child")?.idx;
        const childComp = childMemberIdx !== undefined ? components[childMemberIdx] : null;
        const childTemplateResult: ItemResult | undefined = template.results.find(
          (t) => t.groupId === renderingResult.groupId && t.role === "child",
        );

        if (group && childComp && childTemplateResult?.id) {
          try {
            childIds = await createChildItems(
              authoringService,
              client,
              sitecoreContextId,
              datasourceId,
              comp,
              childComp,
              childTemplateResult.id,
              lang,
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Child item creation failed";
            partialPlacements.push({ componentName: comp.componentName, componentId, datasourceId, childIds: [], error: msg });
            setResult({ pageId, placements: [...partialPlacements] });
            continue;
          }
        }
      }

      partialPlacements.push({ componentName: comp.componentName, componentId, datasourceId, childIds, error: null });
      setResult({ pageId, placements: [...partialPlacements] });
    }

    const placementErrors = partialPlacements.some((p) => p.error);
    setPage({
      state: {
        status: placementErrors ? "error" : "done",
        createdIds: [pageId],
        error: placementErrors ? "Page created but some components could not be placed." : null,
      },
      results: [],
    });
    setRunning(false);
  }, [
    parentId,
    templateId,
    pageName,
    debouncedPageName,
    preflightName,
    placeholder,
    language,
    groups,
    components,
    rendering,
    template.results,
    page.state.createdIds,
    result,
    client,
    sitecoreContextId,
    authoringService,
    setPage,
  ]);

  const isUnlocked = rendering.state.status === "done";
  const canRun = isUnlocked && !!parentId.trim() && !!templateId.trim() && !running && !preflightLoading;
  const isSuccess = result !== null && !result.placements.some((p) => p.error);
  const hasPlacementErrors = result !== null && result.placements.some((p) => p.error);

  const buttonLabel = running ? "Creating page…" : preflightLoading ? "Checking name…" : "Create Example Page";

  return (
    <div className="space-y-4">
      <ItemPickerInput
        id="page-parent-id"
        label="Page Location"
        hint="Sitecore folder where the example page will be created."
        required
        value={parentId}
        selectedItem={selectedTreeItem}
        onChange={(id) => { setParentId(id); setSelectedTreeItem(null); }}
        onSelect={(item) => { setParentId(item.itemId); setSelectedTreeItem(item); }}
      />

      <ItemPickerInput
        id="page-template-id"
        label="Page Template"
        hint="Sitecore template used to create the example page."
        required
        value={templateId}
        selectedItem={selectedTemplateItem}
        onChange={(id) => { setTemplateId(id); setSelectedTemplateItem(null); }}
        onSelect={(item) => { setTemplateId(item.itemId); setSelectedTemplateItem(item); }}
      />

      {isUnlocked && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="page-name">
              Page name<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="page-name"
              required
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="Example page name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="placeholder">
              Placeholder<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="placeholder"
              required
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="headless-main"
            />
            <p className="text-xs text-muted-foreground">Placeholder key where components will be inserted.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">
              Language<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="language"
              required
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="en"
            />
            <p className="text-xs text-muted-foreground">Content language for the page and component datasources.</p>
          </div>
        </div>
      )}

      <NameConflictAlert
        items={isRenamed ? [{ original: preflightInputName, resolved: preflightName! }] : []}
      />

      {!isUnlocked && (
        <Alert>
          <AlertDescription>
            Complete the <strong>Rendering</strong> step first.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="danger">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isSuccess && (
        <Button onClick={handleCreate} disabled={!canRun} className="w-full">
          {buttonLabel}
        </Button>
      )}

      {hasPlacementErrors && (
        <Button variant="outline" onClick={handleCreate} disabled={running} className="w-full">
          Retry
        </Button>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Badge colorScheme="success" size="sm">created</Badge>
              <span className="font-medium">Example page</span>
              <span className="text-xs text-muted-foreground font-mono">{result.pageId}</span>
            </div>
            {result.placements.map((p) => (
              <div key={p.componentName} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-sm">
                  <Badge colorScheme={p.error ? "danger" : "success"} size="sm">
                    {p.error ? "error" : "placed"}
                  </Badge>
                  <span className="font-medium">{p.componentName}</span>
                  {p.datasourceId && (
                    <span className="text-xs text-muted-foreground font-mono truncate">{p.datasourceId}</span>
                  )}
                  {p.error && (
                    <span className="text-xs text-destructive">{p.error}</span>
                  )}
                </div>
                {p.childIds.length > 0 && (
                  <div className="ml-6 flex flex-wrap gap-1">
                    {p.childIds.map((id) => (
                      <span key={id} className="text-xs text-muted-foreground font-mono">{id}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
