import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { experimental_Agent } from "@sitecore-marketplace-sdk/xmc";

function extractApiError(err: unknown, fallback: string): Error {
  const detail =
    (err as { error?: { detail?: string } } | null)?.error?.detail ??
    (err instanceof Error ? err.message : null) ??
    fallback;
  return new Error(detail);
}

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

export async function createPage(
  client: ClientSDK,
  sitecoreContextId: string,
  config: {
    parentId: string;
    templateId: string;
    name: string;
    language?: string;
  },
): Promise<experimental_Agent.CreatePageResponse> {
  try {
    const result = await client.mutate("xmc.agent.pagesCreatePage", {
      params: {
        query: { sitecoreContextId },
        body: {
          parentId: config.parentId,
          templateId: config.templateId,
          name: config.name,
          language: config.language ?? "en",
        },
      },
    });
    const r = result as { data?: experimental_Agent.CreatePageResponse; error?: { detail?: string } };
    if (!r.data) throw new Error(r.error?.detail ?? "Page creation failed");
    return r.data;
  } catch (err) {
    console.error("[agent-service] createPage failed:", err);
    throw extractApiError(err, "Page creation failed");
  }
}

export async function addComponentOnPage(
  client: ClientSDK,
  sitecoreContextId: string,
  config: {
    pageId: string;
    componentRenderingId: string;
    placeholderPath: string;
    componentItemName: string;
    language?: string;
  },
): Promise<experimental_Agent.AddComponentResponse> {
  try {
    const result = await client.mutate("xmc.agent.pagesAddComponentOnPage", {
      params: {
        query: { sitecoreContextId },
        path: { pageId: config.pageId },
        body: {
          componentRenderingId: config.componentRenderingId,
          placeholderPath: config.placeholderPath,
          componentItemName: config.componentItemName,
          language: config.language ?? "en",
        },
      },
    });
    const r = result as { data?: experimental_Agent.AddComponentResponse; error?: { detail?: string } };
    if (!r.data) throw new Error(r.error?.detail ?? "Add component failed");
    return r.data;
  } catch (err) {
    console.error("[agent-service] addComponentOnPage failed:", err);
    throw extractApiError(err, "Add component failed");
  }
}

export async function updateComponentContent(
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
  fields: Record<string, unknown>,
  language: string = "en",
): Promise<experimental_Agent.UpdateContentResponse> {
  try {
    const result = await client.mutate("xmc.agent.contentUpdateContent", {
      params: {
        query: { sitecoreContextId },
        path: { itemId },
        body: { fields, language },
      },
    });
    const r = result as { data?: experimental_Agent.UpdateContentResponse; error?: { detail?: string } };
    if (!r.data) throw new Error(r.error?.detail ?? "Content update failed");
    return r.data;
  } catch (err) {
    console.error("[agent-service] updateComponentContent failed:", err);
    throw extractApiError(err, "Content update failed");
  }
}