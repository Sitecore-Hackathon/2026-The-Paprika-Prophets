import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { experimental_Agent } from "@sitecore-marketplace-sdk/xmc";

export async function fetchSites(
  client: ClientSDK,
  sitecoreContextId: string,
): Promise<experimental_Agent.SiteBasicModel[]> {
  try {
    const response = await client.query("xmc.agent.sitesGetSitesList", {
      params: { query: { sitecoreContextId } },
    });
    const apiData = (response?.data as { data?: unknown })?.data;
    if (Array.isArray(apiData)) return apiData as experimental_Agent.SiteBasicModel[];
    return (apiData as { sites?: experimental_Agent.SiteBasicModel[] } | null)?.sites ?? [];
  } catch (err) {
    console.error("[agent-service] fetchSites failed:", err);
    throw err;
  }
}

export async function fetchSiteDetails(
  client: ClientSDK,
  sitecoreContextId: string,
  siteId: string,
): Promise<experimental_Agent.SiteInformationResponse | null> {
  try {
    const response = await client.query("xmc.agent.sitesGetSiteDetails", {
      params: {
        path: { siteId },
        query: { sitecoreContextId },
      },
    });
    return (
      response?.data as { data?: experimental_Agent.SiteInformationResponse }
    )?.data ?? null;
  } catch (err) {
    console.error("[agent-service] fetchSiteDetails failed:", err);
    throw err;
  }
}