import { addComponentOnPage, updateComponentContent } from "@/lib/services/agent-service";
import type { AuthoringService } from "@/lib/services/authoring-service";
import { generateDummyFieldValue } from "@/lib/utils/dummy-fields";
import type { AnalyzedComponent, TemplateGroup } from "@/lib/types/component";
import type { ItemResult } from "../structure-context";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

const CHILD_ITEM_COUNT = 3;
const MULTIVALUE_FIELD_TYPES = new Set(["Treelist", "Multilist"]);

export type ComponentPlacement = {
  componentName: string;
  componentId: string | null;
  datasourceId: string | null;
  childIds: string[];
  sharedDatasourceId: string | null;
  error: string | null;
};

export type PageResult = {
  pageId: string;
  placements: ComponentPlacement[];
};

export type ProcessPlacementArgs = {
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

const populateDatasourceContent = async (
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
  comp: AnalyzedComponent,
  lang: string,
): Promise<void> => {
  const fields = Object.fromEntries(
    comp.fields.map((f) => [f.name, generateDummyFieldValue(f.type, lang)]),
  );
  await updateComponentContent(client, sitecoreContextId, itemId, fields, lang);
};

const createChildItems = async (
  svc: AuthoringService,
  client: ClientSDK,
  sitecoreContextId: string,
  parentDatasourceId: string,
  parentComp: AnalyzedComponent,
  childComp: AnalyzedComponent,
  childTemplateId: string,
  language: string,
): Promise<string[]> => {
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
};

const createSharedDatasource = async (
  svc: AuthoringService,
  client: ClientSDK,
  sitecoreContextId: string,
  dsParentId: string,
  renderingGroupId: string,
  templateResults: ItemResult[],
  comp: AnalyzedComponent,
  lang: string,
): Promise<string | null> => {
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
};

export const processPlacement = async ({
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
}: ProcessPlacementArgs): Promise<ComponentPlacement> => {
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
};
