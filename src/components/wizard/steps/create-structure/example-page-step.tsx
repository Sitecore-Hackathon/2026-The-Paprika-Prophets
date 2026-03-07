"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWizard } from "@/components/wizard/wizard-context";
import { useMarketplaceClient } from "@/components/providers/marketplace-provider";
import { useSiteContext } from "@/components/providers/site-provider";
import { useTenantContext } from "@/components/providers/tenant-provider";
import { useStructure } from "./structure-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorAlert } from "@/components/wizard/error-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemPickerInput } from "@/components/wizard/item-picker-input";
import type { SelectedTreeItem } from "@/components/wizard/site-tree";
import { createPage, addComponentOnPage, updateComponentContent, fetchLanguages } from "@/lib/services/agent-service";
import type { AuthoringService } from "@/lib/services/authoring-service";
import { generateDummyFieldValue } from "@/lib/utils/dummy-fields";
import type { AnalyzedComponent, TemplateGroup } from "@/lib/types/component";
import type { ItemResult } from "./structure-context";
import { DEFAULT_LANGUAGE, DEFAULT_PLACEHOLDER } from "@/lib/constants";
import { usePreflightNames } from "./use-preflight-names";
import { NameConflictAlert } from "./name-conflict-alert";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";


const CHILD_ITEM_COUNT = 3;
/** Field types that hold pipe-separated item IDs (multivalue references). */
const MULTIVALUE_FIELD_TYPES = new Set(["Treelist", "Multilist"]);


type ComponentPlacement = {
  componentName: string;
  componentId: string | null;
  datasourceId: string | null;
  /** IDs of child items created under the parent datasource (list components only). */
  childIds: string[];
  /** ID of the shared datasource copy created under AppDatasourcesPath. */
  sharedDatasourceId: string | null;
  error: string | null;
};

type PageResult = {
  pageId: string;
  placements: ComponentPlacement[];
};


/** Populates a datasource item with generated dummy values for every field on comp. */
async function populateDatasourceContent(
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
  comp: AnalyzedComponent,
  lang: string,
): Promise<void> {
  const fields = Object.fromEntries(
    comp.fields.map((f) => [f.name, generateDummyFieldValue(f.type, lang)]),
  );
  await updateComponentContent(client, sitecoreContextId, itemId, fields, lang);
}

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
    await populateDatasourceContent(client, sitecoreContextId, item.itemId, childComp, language);
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

/**
 * Creates a named folder under dsParentId (using the group's folder template)
 * then creates a single datasource item inside it, populated with dummy data.
 * Returns the shared datasource item ID, or null if anything is missing.
 */
async function createSharedDatasource(
  svc: AuthoringService,
  client: ClientSDK,
  sitecoreContextId: string,
  dsParentId: string,
  renderingGroupId: string,
  templateResults: ItemResult[],
  comp: AnalyzedComponent,
  lang: string,
): Promise<string | null> {
  const folderTemplate = templateResults.find(
    (t) => t.groupId === renderingGroupId && t.role === "folder",
  );
  const dataTemplate = templateResults.find(
    (t) => t.groupId === renderingGroupId && (t.role === "parent" || t.role === "standalone"),
  );
  if (!folderTemplate?.id || !dataTemplate?.id) return null;

  const folderItem = await svc.createItem({
    name: folderTemplate.resolvedName,
    templateId: folderTemplate.id,
    parentId: dsParentId,
    parentPath: "",
    language: lang,
  });
  if (!folderItem?.itemId) return null;

  const sharedItem = await svc.createItem({
    name: comp.componentName,
    templateId: dataTemplate.id,
    parentId: folderItem.itemId,
    parentPath: "",
    language: lang,
  });
  if (!sharedItem?.itemId) return null;

  await populateDatasourceContent(client, sitecoreContextId, sharedItem.itemId, comp, lang);
  return sharedItem.itemId;
}

type ProcessPlacementArgs = {
  svc: AuthoringService;
  client: ClientSDK;
  sitecoreContextId: string;
  renderingResult: ItemResult;
  comp: AnalyzedComponent;
  groups: TemplateGroup[];
  components: AnalyzedComponent[];
  templateResults: ItemResult[];
  dsParentId: string;
  pageId: string;
  placeholder: string;
  lang: string;
};

/**
 * Handles the full placement lifecycle for one rendering:
 * add to page → populate datasource → create children (list) → create shared datasource.
 * Returns a completed ComponentPlacement (success or error).
 */
async function processPlacement({
  svc,
  client,
  sitecoreContextId,
  renderingResult,
  comp,
  groups,
  components,
  templateResults,
  dsParentId,
  pageId,
  placeholder,
  lang,
}: ProcessPlacementArgs): Promise<ComponentPlacement> {
  const base = { componentName: comp.componentName, childIds: [] as string[], sharedDatasourceId: null };

  if (!renderingResult.id) {
    return { ...base, componentId: null, datasourceId: null, error: "Rendering item was not created" };
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
    return { ...base, componentId: null, datasourceId: null, error: msg };
  }

  if (datasourceId) {
    try {
      await populateDatasourceContent(client, sitecoreContextId, datasourceId, comp, lang);
    } catch {
      return { ...base, componentId, datasourceId, error: "Component added but content update failed" };
    }
  }

  // For list groups: create child items and link them to the parent datasource
  let childIds: string[] = [];
  if (renderingResult.role === "parent" && datasourceId) {
    const group = groups.find((g) => g.id === renderingResult.groupId);
    const childMemberIdx = group?.members.find((m) => m.role === "child")?.idx;
    const childComp = childMemberIdx !== undefined ? components[childMemberIdx] : null;
    const childTemplateResult = templateResults.find(
      (t) => t.groupId === renderingResult.groupId && t.role === "child",
    );
    if (group && childComp && childTemplateResult?.id) {
      try {
        childIds = await createChildItems(
          svc, client, sitecoreContextId, datasourceId, comp, childComp, childTemplateResult.id, lang,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Child item creation failed";
        return { ...base, componentId, datasourceId, childIds: [], error: msg };
      }
    }
  }

  // Create shared datasource folder + item under AppDatasourcesPath (non-fatal)
  let sharedDatasourceId: string | null = null;
  if (dsParentId && datasourceId) {
    try {
      sharedDatasourceId = await createSharedDatasource(
        svc, client, sitecoreContextId, dsParentId, renderingResult.groupId, templateResults, comp, lang,
      );
    } catch {
      // Non-fatal
    }
  }

  return { componentName: comp.componentName, componentId, datasourceId, childIds, sharedDatasourceId, error: null };
}

export const ExamplePageStep = () => {
  const { data } = useWizard();
  const { siteDetails, siteSettings } = useSiteContext();
  const client = useMarketplaceClient();
  const { selectedTenant } = useTenantContext();
  const sitecoreContextId = selectedTenant?.context?.preview ?? "";
  const { authoringService, template, rendering, page, setPage } = useStructure();

  const components = useMemo<AnalyzedComponent[]>(
    () => (data.editedComponents as AnalyzedComponent[]) ?? [],
    [data.editedComponents],
  );

  const groups = useMemo<TemplateGroup[]>(
    () => (data.templateGroups as TemplateGroup[]) ?? [],
    [data.templateGroups],
  );

  const defaultPageLocation = siteDetails?.page_locations?.[0] ?? null;
  const routeTemplate = siteSettings?.routeBaseTemplateItem ?? null;
  const defaultTemplateId = siteSettings?.RouteBaseTemplate ?? "";
  const defaultDsParent = siteSettings?.appDatasourcesItem ?? null;

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
  const [dsParentId, setDsParentId] = useState(siteSettings?.AppDatasourcesPath ?? "");
  const [dsTreeItem, setDsTreeItem] = useState<SelectedTreeItem | null>(defaultDsParent);
  const [pageName, setPageName] = useState(`${components[0]?.componentName || "Example"}`);
  const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [availableLanguages, setAvailableLanguages] = useState<{ name: string; displayName: string }[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sitecoreContextId) return;
    setLanguagesLoading(true);
    fetchLanguages(client, sitecoreContextId)
      .then((langs) => {
        const items = langs
          .filter((l) => l.name)
          .map((l) => ({ name: l.name!, displayName: l.displayName ?? l.name! }));
        setAvailableLanguages(items);
        // Auto-select first language if current value is not in the list
        if (items.length > 0 && !items.some((l) => l.name === language)) {
          setLanguage(items[0].name);
        }
      })
      .finally(() => setLanguagesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitecoreContextId]);

  // Reset result whenever key inputs change so the UI goes back to the Create state
  useEffect(() => {
    if (running || result === null) return;
    setResult(null);
    setError(null);
    setPage((prev) => ({ ...prev, state: { status: "idle", createdIds: [], error: null } }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageName, parentId, templateId, placeholder, language]);

  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));
  const fieldError = (field: string, value: string) =>
    touched.has(field) && !value.trim() ? "This field is required." : undefined;

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
    setRunning(true);
    setError(null);
    setPage((prev) => ({ ...prev, state: { ...prev.state, status: "running", error: null } }));

    const resolvedName = preflightName ?? (preflightInputName || pageName.trim());
    const lang = language || DEFAULT_LANGUAGE;

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

      const placement = await processPlacement({
        svc: authoringService,
        client,
        sitecoreContextId,
        renderingResult,
        comp,
        groups,
        components,
        templateResults: template.results,
        dsParentId,
        pageId,
        placeholder,
        lang,
      });
      partialPlacements.push(placement);
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
    dsParentId,
    result,
    client,
    sitecoreContextId,
    authoringService,
    setPage,
  ]);

  const isUnlocked = rendering.state.status === "done";
  const canRun =
    isUnlocked &&
    !!parentId.trim() &&
    !!templateId.trim() &&
    !!pageName.trim() &&
    !!placeholder.trim() &&
    !!language.trim() &&
    !running &&
    !preflightLoading;
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
        error={fieldError("parentId", parentId)}
        value={parentId}
        selectedItem={selectedTreeItem}
        onChange={(id) => { setParentId(id); setSelectedTreeItem(null); touch("parentId"); }}
        onSelect={(item) => { setParentId(item.itemId); setSelectedTreeItem(item); touch("parentId"); }}
        onBlur={() => touch("parentId")}
      />

      <ItemPickerInput
        id="page-template-id"
        label="Page Template"
        hint="Sitecore template used to create the example page."
        required
        error={fieldError("templateId", templateId)}
        value={templateId}
        selectedItem={selectedTemplateItem}
        onChange={(id) => { setTemplateId(id); setSelectedTemplateItem(null); touch("templateId"); }}
        onSelect={(item) => { setTemplateId(item.itemId); setSelectedTemplateItem(item); touch("templateId"); }}
        onBlur={() => touch("templateId")}
      />

      <ItemPickerInput
        id="ds-parent-id"
        label="App Datasources Path"
        hint="Shared datasource root — a folder per group will be created here with a sample datasource item."
        value={dsParentId}
        selectedItem={dsTreeItem}
        onChange={(id) => { setDsParentId(id); setDsTreeItem(null); }}
        onSelect={(item) => { setDsParentId(item.itemId); setDsTreeItem(item); }}
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
              onChange={(e) => { setPageName(e.target.value); touch("pageName"); }}
              onBlur={() => touch("pageName")}
              placeholder="Example page name"
              aria-invalid={!!fieldError("pageName", pageName)}
              className={fieldError("pageName", pageName) ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {fieldError("pageName", pageName) && (
              <p className="text-xs text-destructive">{fieldError("pageName", pageName)}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="placeholder">
              Placeholder<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="placeholder"
              required
              value={placeholder}
              onChange={(e) => { setPlaceholder(e.target.value); touch("placeholder"); }}
              onBlur={() => touch("placeholder")}
              placeholder={DEFAULT_PLACEHOLDER}
              aria-invalid={!!fieldError("placeholder", placeholder)}
              className={fieldError("placeholder", placeholder) ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {fieldError("placeholder", placeholder)
              ? <p className="text-xs text-destructive">{fieldError("placeholder", placeholder)}</p>
              : <p className="text-xs text-muted-foreground">Placeholder key where components will be inserted.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">
              Language<span className="text-destructive ml-0.5">*</span>
            </Label>
            {availableLanguages.length > 0 ? (
              <Select
                value={language}
                onValueChange={(val) => { setLanguage(val); touch("language"); }}
              >
                <SelectTrigger
                  id="language"
                  className="w-full"
                  aria-invalid={!!fieldError("language", language)}
                >
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((l) => (
                    <SelectItem key={l.name} value={l.name}>
                      {l.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="language"
                required
                value={language}
                onChange={(e) => { setLanguage(e.target.value); touch("language"); }}
                onBlur={() => touch("language")}
                placeholder={languagesLoading ? "Loading…" : DEFAULT_LANGUAGE}
                disabled={languagesLoading}
                aria-invalid={!!fieldError("language", language)}
                className={fieldError("language", language) ? "border-destructive focus-visible:ring-destructive" : ""}
              />
            )}
            {fieldError("language", language)
              ? <p className="text-xs text-destructive">{fieldError("language", language)}</p>
              : <p className="text-xs text-muted-foreground">Content language for the page and component datasources.</p>}
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

      <ErrorAlert error={error} />

      {!isSuccess && !hasPlacementErrors && (
        <Button onClick={handleCreate} disabled={!canRun} className="w-full">
          {buttonLabel}
        </Button>
      )}

      {hasPlacementErrors && (
        <Button variant="outline" onClick={handleCreate} disabled={running} className="w-full">
          {running ? "Retrying…" : "Retry"}
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
                  {p.sharedDatasourceId && (
                    <span className="text-xs text-muted-foreground font-mono truncate" title="Shared datasource">↳ {p.sharedDatasourceId}</span>
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
};
