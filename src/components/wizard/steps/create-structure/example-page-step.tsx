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
import { generateDummyFieldValue } from "@/lib/dummy-fields";
import type { AnalyzedComponent } from "@/lib/types/component";
import { DEV_COMPONENTS } from "./dev-data";
import { usePreflightNames } from "./use-preflight-names";
import { NameConflictAlert } from "./name-conflict-alert";

type ComponentPlacement = {
  componentName: string;
  componentId: string | null;
  datasourceId: string | null;
  error: string | null;
};

type PageResult = {
  pageId: string;
  placements: ComponentPlacement[];
};

export function ExamplePageStep() {
  const { data } = useWizard();
  const { siteDetails, siteSettings } = useSiteContext();
  const client = useMarketplaceClient();
  const { selectedTenant } = useTenantContext();
  const sitecoreContextId = selectedTenant?.context?.preview ?? "";
  const { authoringService, rendering, setPage } = useStructure();

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
    routeTemplate
      ? { itemId: defaultTemplateId, name: routeTemplate.name, path: routeTemplate.path }
      : null,
  );
  const [pageName, setPageName] = useState(`${components[0]?.componentName || "Example"}`);
  const [placeholder, setPlaceholder] = useState("headless-main");
  const [language, setLanguage] = useState("en");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preflight: resolve unique page name (debounced)
  const [debouncedPageName, setDebouncedPageName] = useState(pageName);
  const [preflightKey, setPreflightKey] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedPageName(pageName), 400);
    return () => clearTimeout(id);
  }, [pageName]);

  const preflightInputName = debouncedPageName.trim();
  const preflightInputNames = useMemo(
    () => (preflightInputName ? [preflightInputName] : []),
    [preflightInputName],
  );
  const { preflightNames, preflightLoading } = usePreflightNames(parentId, preflightInputNames, authoringService, preflightKey);
  const preflightName = preflightInputName ? (preflightNames?.[preflightInputName] ?? null) : null;
  const isRenamed = preflightName !== null && preflightName !== preflightInputName;

  const handleRetry = useCallback(() => {
    setResult(null);
    setError(null);
    setPreflightKey((k) => k + 1);
  }, []);

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
    setResult(null);
    setPage((prev) => ({ ...prev, state: { ...prev.state, status: "running", error: null } }));

    const resolvedName = preflightName ?? (preflightInputName || pageName.trim());

    // 1. Create the page
    let pageId: string;
    try {
      const pageResponse = await createPage(client, sitecoreContextId, {
        parentId,
        templateId,
        name: resolvedName,
        language: language || "en",
      });
      pageId = pageResponse.itemId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Page creation failed";
      setError(msg);
      setPage({ state: { status: "error", createdIds: [], error: msg }, results: [] });
      setRunning(false);
      return;
    }

    // 2. Add each component and update its datasource content
    const placements: ComponentPlacement[] = [];

    for (const comp of renderableComponents) {
      const renderingItemId = rendering.results.find((r) => r.originalName === comp.componentName)?.id;
      if (!renderingItemId) {
        placements.push({ componentName: comp.componentName, componentId: null, datasourceId: null, error: "Rendering item not found" });
        continue;
      }

      let componentId: string | null = null;
      let datasourceId: string | null = null;

      try {
        const addResponse = await addComponentOnPage(client, sitecoreContextId, {
          pageId,
          componentRenderingId: renderingItemId,
          placeholderPath: placeholder,
          componentItemName: `${comp.componentName}`,
          language: language || "en",
        });
        componentId = addResponse.componentId;
        datasourceId = addResponse.datasourceId ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Add component failed";
        placements.push({ componentName: comp.componentName, componentId: null, datasourceId: null, error: msg });
        continue;
      }

      // 3. Update datasource content with generated dummy field values
      if (datasourceId) {
        const initialFields = Object.fromEntries(
          comp.fields.map((f) => [f.name, generateDummyFieldValue(f.type, language || "en")]),
        );
        try {
          await updateComponentContent(client, sitecoreContextId, datasourceId, initialFields);
        } catch {
          // Non-fatal: component was added, content update failed
          placements.push({ componentName: comp.componentName, componentId, datasourceId, error: "Component added but content update failed" });
          continue;
        }
      }

      placements.push({ componentName: comp.componentName, componentId, datasourceId, error: null });
    }

    const placementErrors = placements.some((p) => p.error);
    setResult({ pageId, placements });
    setPage({
      state: {
        status: placementErrors ? "error" : "done",
        createdIds: [pageId],
        error: placementErrors ? "Page created but some components could not be placed." : null,
      },
      results: [],
    });
    setRunning(false);
  }, [parentId, templateId, pageName, debouncedPageName, preflightName, placeholder, language, renderableComponents, rendering, client, sitecoreContextId, setPage]);

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
        value={parentId}
        selectedItem={selectedTreeItem}
        onChange={(id) => { setParentId(id); setSelectedTreeItem(null); }}
        onSelect={(item) => { setParentId(item.itemId); setSelectedTreeItem(item); }}
      />

      <ItemPickerInput
        id="page-template-id"
        label="Page Template"
        hint="Sitecore template used to create the example page."
        value={templateId}
        selectedItem={selectedTemplateItem}
        onChange={(id) => { setTemplateId(id); setSelectedTemplateItem(null); }}
        onSelect={(item) => { setTemplateId(item.itemId); setSelectedTemplateItem(item); }}
      />

      {isUnlocked && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="page-name">Page name</Label>
            <Input
              id="page-name"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="Example page name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="placeholder">Placeholder</Label>
            <Input
              id="placeholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="headless-main"
            />
            <p className="text-xs text-muted-foreground">Placeholder key where components will be inserted.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Input
              id="language"
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
        <Button variant="outline" onClick={handleRetry} disabled={running} className="w-full">
          Retry
        </Button>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge colorScheme="success" size="sm">created</Badge>
              Example page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Page ID: </span>
              <code className="font-mono text-xs">{result.pageId}</code>
            </div>
            {result.placements.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t">
                {result.placements.map((p) => (
                  <div key={p.componentName} className="flex items-start gap-2">
                    <Badge colorScheme={p.error ? "danger" : "success"} size="sm" className="mt-0.5 shrink-0">
                      {p.error ? "error" : "placed"}
                    </Badge>
                    <div className="min-w-0">
                      <span className="font-medium">{p.componentName}</span>
                      {p.datasourceId && (
                        <div className="text-xs text-muted-foreground font-mono truncate">{p.datasourceId}</div>
                      )}
                      {p.error && (
                        <div className="text-xs text-destructive">{p.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
