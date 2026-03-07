import type { AnalyzedComponent, TemplateGroup } from "@/lib/types/component";
import type { TemplateConfig } from "@/lib/types/graphql";
import type { AuthoringService } from "@/lib/services/authoring-service";
import type { ItemResult } from "../structure-context";
import { DEFAULT_LANGUAGE, WELL_KNOWN_TEMPLATES } from "@/lib/constants";

/** Creation order within a group — folders must be last so they can reference earlier template IDs. */
const ROLE_ORDER: Record<string, number> = {
  child: 0,
  standalone: 0,
  parent: 1,
  folder: 2,
};

export const sortedMembers = (group: TemplateGroup) =>
  [...group.members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99),
  );

export const collectAllNames = (
  groups: TemplateGroup[],
  components: AnalyzedComponent[],
): string[] =>
  groups.flatMap((g) =>
    g.members.map((m) => components[m.idx]?.componentName).filter(Boolean) as string[],
  );

export const countTemplates = (groups: TemplateGroup[]): number =>
  groups.reduce(
    (acc, g) => acc + g.members.filter((m) => m.role !== "folder").length,
    0,
  );

const buildFolderConfig = (
  name: string,
  parentId: string,
  parentPath: string,
): TemplateConfig => ({
  name,
  parentId,
  parentPath,
  sections: [],
  baseTemplateIds: [WELL_KNOWN_TEMPLATES.COMMON_FOLDER],
  createStandardValuesItem: true,
});

const buildDataTemplateConfig = (
  name: string,
  comp: AnalyzedComponent,
  parentId: string,
  parentPath: string,
): TemplateConfig => ({
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
});

const createFolderMember = async (
  svc: AuthoringService,
  group: TemplateGroup,
  comp: AnalyzedComponent,
  resolvedName: string,
  parentId: string,
  parentPath: string,
  partial: ItemResult[],
): Promise<ItemResult> => {
  const insertRole = group.type === "list" ? "parent" : "standalone";
  const insertTemplateId =
    partial.find((r) => r.groupId === group.id && r.role === insertRole)?.id ?? "";

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
};

const createDataTemplateMember = async (
  svc: AuthoringService,
  group: TemplateGroup,
  member: TemplateGroup["members"][number],
  comp: AnalyzedComponent,
  resolvedName: string,
  parentId: string,
  parentPath: string,
  partial: ItemResult[],
): Promise<ItemResult> => {
  try {
    const config = buildDataTemplateConfig(resolvedName, comp, parentId, parentPath);
    const { templateId, standardValuesItemId } = await svc.createTemplate(config);

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
};

export const processGroups = async (
  svc: AuthoringService,
  groups: TemplateGroup[],
  components: AnalyzedComponent[],
  parentId: string,
  parentPath: string,
  preflightNames: Record<string, string> | null,
  initial: ItemResult[],
  onProgress: (results: ItemResult[]) => void,
): Promise<ItemResult[]> => {
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
};
