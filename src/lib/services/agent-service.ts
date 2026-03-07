import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { experimental_Agent, experimental_Sites } from "@sitecore-marketplace-sdk/xmc";
import { DEFAULT_LANGUAGE } from "@/lib/constants";

type ApiResponse<T> = { data?: T; error?: { detail?: string } };

export const fetchLanguages = async (
  client: ClientSDK,
  sitecoreContextId: string,
): Promise<experimental_Sites.Language[]> => {
  try {
    const response = await client.query("xmc.sites.listLanguages", {
      params: { query: { sitecoreContextId } },
    });
    const data = (response as ApiResponse<{ data?: experimental_Sites.Language[] }>).data?.data;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[agent-service] fetchLanguages failed:", extractApiError(err, "Fetch languages failed").message);
    return [];
  }
}

export const fetchSites = async (
  client: ClientSDK,
  sitecoreContextId: string,
): Promise<experimental_Agent.SiteBasicModel[]> => {
  try {
    const response = await client.query("xmc.agent.sitesGetSitesList", {
      params: { query: { sitecoreContextId } },
    });
    const inner = (response as ApiResponse<{ data?: unknown }>).data?.data;
    if (Array.isArray(inner)) return inner as experimental_Agent.SiteBasicModel[];
    return (inner as { sites?: experimental_Agent.SiteBasicModel[] } | null)?.sites ?? [];
  } catch (err) {
    console.error("[agent-service] fetchSites failed:", err);
    throw extractApiError(err, "Fetch sites failed");
  }
}

export const fetchSiteDetails = async (
  client: ClientSDK,
  sitecoreContextId: string,
  siteId: string,
): Promise<experimental_Agent.SiteInformationResponse | null> => {
  try {
    const response = await client.query("xmc.agent.sitesGetSiteDetails", {
      params: { path: { siteId }, query: { sitecoreContextId } },
    });
    return (response as ApiResponse<{ data?: experimental_Agent.SiteInformationResponse }>).data?.data ?? null;
  } catch (err) {
    console.error("[agent-service] fetchSiteDetails failed:", err);
    throw extractApiError(err, "Fetch site details failed");
  }
}

export const createPage = async (
  client: ClientSDK,
  sitecoreContextId: string,
  config: {
    parentId: string;
    templateId: string;
    name: string;
    language?: string;
  },
): Promise<experimental_Agent.CreatePageResponse> => {
  try {
    const result = await client.mutate("xmc.agent.pagesCreatePage", {
      params: {
        query: { sitecoreContextId },
        body: {
          parentId: config.parentId,
          templateId: config.templateId,
          name: config.name,
          language: config.language ?? DEFAULT_LANGUAGE,
        },
      },
    });
    return unwrapMutation<experimental_Agent.CreatePageResponse>(result, "Page creation failed");
  } catch (err) {
    console.error("[agent-service] createPage failed:", err);
    throw extractApiError(err, "Page creation failed");
  }
}

export const addComponentOnPage = async (
  client: ClientSDK,
  sitecoreContextId: string,
  config: {
    pageId: string;
    componentRenderingId: string;
    placeholderPath: string;
    componentItemName: string;
    language?: string;
  },
): Promise<experimental_Agent.AddComponentResponse> => {
  try {
    const result = await client.mutate("xmc.agent.pagesAddComponentOnPage", {
      params: {
        query: { sitecoreContextId },
        path: { pageId: config.pageId },
        body: {
          componentRenderingId: config.componentRenderingId,
          placeholderPath: config.placeholderPath,
          componentItemName: config.componentItemName,
          language: config.language ?? DEFAULT_LANGUAGE,
        },
      },
    });
    return unwrapMutation<experimental_Agent.AddComponentResponse>(result, "Add component failed");
  } catch (err) {
    console.error("[agent-service] addComponentOnPage failed:", err);
    throw extractApiError(err, "Add component failed");
  }
}

export const updateComponentContent = async (
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
  fields: Record<string, unknown>,
  language: string = DEFAULT_LANGUAGE,
): Promise<experimental_Agent.UpdateContentResponse> => {
  try {
    const result = await client.mutate("xmc.agent.contentUpdateContent", {
      params: {
        query: { sitecoreContextId },
        path: { itemId },
        body: { fields, language },
      },
    });
    return unwrapMutation<experimental_Agent.UpdateContentResponse>(result, "Content update failed");
  } catch (err) {
    console.error("[agent-service] updateComponentContent failed:", err);
    throw extractApiError(err, "Content update failed");
  }
}

function extractApiError(err: unknown, fallback: string): Error {
  const detail =
    (err as { error?: { detail?: string } } | null)?.error?.detail ??
    (err instanceof Error ? err.message : null) ??
    fallback;
  return new Error(detail);
}

/** Unwraps a mutation result, throwing a normalised error when `data` is absent. */
function unwrapMutation<T>(result: unknown, fallback: string): T {
  const r = result as ApiResponse<T>;
  if (!r.data) throw new Error(r.error?.detail ?? fallback);
  return r.data;
}