"use client";

import { useCallback, useEffect, useState } from "react";
import { useMarketplaceClient } from "@/components/providers/marketplace";
import { useTenantContext } from "@/components/providers/tenant-provider";
import { useSiteContext } from "@/components/providers/site-provider";
import { useWizard } from "@/components/wizard/wizard-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchSiteDetails, fetchSites } from "@/lib/services/agent-service";
import type { experimental_Agent } from "@sitecore-marketplace-sdk/xmc";
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { SiteSettings } from "@/lib/types/agent";
import { AuthoringService } from "@/lib/services/authoring-service";

export function SiteSelector() {
  const client = useMarketplaceClient();
  const { selectedTenant } = useTenantContext();
  const {
    selectedSite,
    setSelectedSite,
    setSiteDetails,
    setSiteSettings,
    resetSiteContext,
  } = useSiteContext();
  const { goNext } = useWizard();

  const [sites, setSites] = useState<experimental_Agent.SiteBasicModel[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const sitecoreContextId = selectedTenant?.context?.preview ?? "";

  useEffect(() => {
    if (!selectedTenant || !sitecoreContextId) {
      resetSiteContext();
      setSites([]);
      return;
    }

    setSitesLoading(true);
    setSitesError(null);
    resetSiteContext();

    fetchSites(client, sitecoreContextId)
      .then(setSites)
      .catch((err: unknown) =>
        setSitesError(err instanceof Error ? err.message : "Failed to fetch sites"),
      )
      .finally(() => setSitesLoading(false));
  }, [selectedTenant, sitecoreContextId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSiteSelect = useCallback(
    async (siteId: string) => {
      const site = sites.find((s) => s.id === siteId) ?? null;
      setSelectedSite(site);
      setSiteDetails(null);
      setSiteSettings(null);
      if (!site) return;

      setDetailsLoading(true);
      fetchSiteDetails(client, sitecoreContextId, site.id)
        .then(async (details) => {
          setSiteDetails(details);
          if (details?.rootPath) {
            const settings = await fetchSiteSettings(client, sitecoreContextId, `${details.rootPath}/Settings`);
            if (settings) {
              const authoring = new AuthoringService(client, sitecoreContextId);
              const [tpl, rndr, rt, ds] = await Promise.allSettled([
                settings.Templates ? authoring.getItemById(settings.Templates) : Promise.resolve(null),
                settings.RenderingsPath ? authoring.getItemById(settings.RenderingsPath) : Promise.resolve(null),
                settings.RouteBaseTemplate ? authoring.getItemById(settings.RouteBaseTemplate) : Promise.resolve(null),
                settings.AppDatasourcesPath ? authoring.getItemById(settings.AppDatasourcesPath) : Promise.resolve(null),
              ]);
              setSiteSettings({
                ...settings,
                templatesItem: tpl.status === "fulfilled" ? tpl.value : null,
                renderingsItem: rndr.status === "fulfilled" ? rndr.value : null,
                routeBaseTemplateItem: rt.status === "fulfilled" ? rt.value : null,
                appDatasourcesItem: ds.status === "fulfilled" ? ds.value : null,
              });
            } else {
              setSiteSettings(null);
            }
          }
        })
        .catch(() => {
          setSiteDetails(null);
          setSiteSettings(null);
        })
        .finally(() => setDetailsLoading(false));
    },
    [client, sitecoreContextId, sites, setSelectedSite, setSiteDetails, setSiteSettings],
  );

  if (!selectedTenant) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Site</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sitesError && (
          <Alert variant="default">
            <AlertDescription>{sitesError}</AlertDescription>
          </Alert>
        )}

        <Select
          value={selectedSite?.id ?? ""}
          onValueChange={handleSiteSelect}
          disabled={sitesLoading || sites.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={sitesLoading ? "Loading sites…" : "Select site"}
            />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={goNext}
          disabled={!selectedSite || detailsLoading}
          className="w-full"
        >
          {detailsLoading ? "Loading details…" : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}

export async function fetchSiteSettings(
  client: ClientSDK,
  sitecoreContextId: string,
  path: string,
): Promise<SiteSettings | null> {
  try {
    const authoring = new AuthoringService(client, sitecoreContextId);
    const item = await authoring.getItemWithFields(path);
    if (!item) return null;

    const field = (name: string) =>
      item.fields?.nodes.find((f) => f.name === name)?.value ?? null;

    return {
      RouteBaseTemplate: field("RouteBaseTemplate"),
      RenderingsPath: field("RenderingsPath"),
      Templates: field("Templates"),
      AppDatasourcesPath: field("AppDatasourcesPath"),
    };
  } catch (err) {
    console.error("[site-selector] fetchSiteSettings failed:", err);
    throw err;
  }
}

