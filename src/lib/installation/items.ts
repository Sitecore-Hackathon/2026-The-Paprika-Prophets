import type { ItemConfig } from "@/lib/types/graphql";
import { SITECORE_IDS, SITECORE_PATHS } from "./constants";
import { DEFAULT_LANGUAGE, DEFAULT_ANALYSIS_MODEL, DEFAULT_CODING_MODEL } from "@/lib/constants";

export type ItemConfigWithTemplateName = Omit<ItemConfig, "templateId"> & {
  templateName: string;
  templateId?: string;
};

export const COMPONENT_FORGE_FOLDER: ItemConfigWithTemplateName = {
  name: "Component Forge",
  templateName: "ComponentForge Folder",
  parentId: SITECORE_IDS.SYSTEM.MODULES,
  parentPath: SITECORE_PATHS.SYSTEM.MODULES,
};

export const COMPONENT_FORGE_SETTINGS: ItemConfigWithTemplateName = {
  name: "Settings",
  templateName: "ComponentForge Settings",
  parentId: SITECORE_IDS.SYSTEM.MODULES,
  parentPath: SITECORE_PATHS.MODULE.ROOT,
  language: DEFAULT_LANGUAGE,
  fields: [
    { name: "OpenAI API Key", value: "" },
    { name: "Analysis LLM Model", value: DEFAULT_ANALYSIS_MODEL },
    { name: "Coding LLM Model", value: DEFAULT_CODING_MODEL },
    { name: "Module Version", value: "1.0.0" },
  ],
};

export const COMPONENT_FORGE_LOGS_FOLDER: ItemConfigWithTemplateName = {
  name: "Logs",
  templateName: "ComponentForge Logs Folder",
  parentId: SITECORE_IDS.SYSTEM.MODULES,
  parentPath: SITECORE_PATHS.MODULE.ROOT,
};

export const INSTALLATION_ITEMS: ItemConfigWithTemplateName[] = [
  COMPONENT_FORGE_FOLDER,
  COMPONENT_FORGE_SETTINGS,
  COMPONENT_FORGE_LOGS_FOLDER,
];
