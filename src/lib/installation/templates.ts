import type { TemplateConfig } from "@/lib/graphql/types";
import { SITECORE_IDS, SITECORE_PATHS } from "./constants";

export const COMPONENT_FORGE_FOLDER_TEMPLATE: TemplateConfig = {
  name: "ComponentForge Folder",
  parentId: SITECORE_IDS.TEMPLATES.USER_DEFINED,
  parentPath: SITECORE_PATHS.TEMPLATES.COMPONENT_FORGE,
  sections: [
    {
      name: "Data",
      fields: [],
    },
  ],
};

export const COMPONENT_FORGE_SETTINGS_TEMPLATE: TemplateConfig = {
  name: "ComponentForge Settings",
  parentId: SITECORE_IDS.TEMPLATES.USER_DEFINED,
  parentPath: SITECORE_PATHS.TEMPLATES.COMPONENT_FORGE,
  sections: [
    {
      name: "Settings",
      fields: [
        { name: "OpenAI API Key", type: "Single-Line Text" },
        { name: "LLM Model", type: "Single-Line Text" },
      ],
    },
  ],
};

export const COMPONENT_FORGE_LOGS_FOLDER_TEMPLATE: TemplateConfig = {
  name: "ComponentForge Logs Folder",
  parentId: SITECORE_IDS.TEMPLATES.USER_DEFINED,
  parentPath: SITECORE_PATHS.TEMPLATES.COMPONENT_FORGE,
  sections: [
    {
      name: "Data",
      fields: [],
    },
  ],
};

export const COMPONENT_FORGE_LOG_ENTRY_TEMPLATE: TemplateConfig = {
  name: "ComponentForge LogEntry",
  parentId: SITECORE_IDS.TEMPLATES.USER_DEFINED,
  parentPath: SITECORE_PATHS.TEMPLATES.COMPONENT_FORGE,
  sections: [
    {
      name: "Data",
      fields: [{ name: "Logs", type: "Multi-Line Text" }],
    },
  ],
};

export const INSTALLATION_TEMPLATES: TemplateConfig[] = [
  COMPONENT_FORGE_FOLDER_TEMPLATE,
  COMPONENT_FORGE_SETTINGS_TEMPLATE,
  COMPONENT_FORGE_LOGS_FOLDER_TEMPLATE,
  COMPONENT_FORGE_LOG_ENTRY_TEMPLATE,
];
