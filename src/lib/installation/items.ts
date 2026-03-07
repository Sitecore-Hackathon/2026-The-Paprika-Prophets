import type { ItemConfig } from "@/lib/graphql/types";
import { SITECORE_IDS, SITECORE_PATHS } from "./constants";

export interface ItemConfigWithTemplateName extends Omit<ItemConfig, "templateId"> {
  templateName: string;
  templateId?: string;
}

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
  parentPath: SITECORE_PATHS.SYSTEM.MODULES + "/Component Forge",
  language: "en",
  fields: [
    { name: "OpenAI API Key", value: "" },
    { name: "Analysis LLM Model", value: "gpt-4o" },
    { name: "Coding LLM Model", value: "gpt-5.3-codex" },
    { name: "Module Version", value: "1.0.0" },
  ],
};

export const COMPONENT_FORGE_LOGS_FOLDER: ItemConfigWithTemplateName = {
  name: "Logs",
  templateName: "ComponentForge Logs Folder",
  parentId: SITECORE_IDS.SYSTEM.MODULES,
  parentPath: SITECORE_PATHS.SYSTEM.MODULES + "/Component Forge",
};

export const INSTALLATION_ITEMS: ItemConfigWithTemplateName[] = [
  COMPONENT_FORGE_FOLDER,
  COMPONENT_FORGE_SETTINGS,
  COMPONENT_FORGE_LOGS_FOLDER,
];
