import type { TemplateConfig } from "@/lib/types/graphql";
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
        { name: "Analysis LLM Model", type: "Single-Line Text" },
        { name: "Coding LLM Model", type: "Single-Line Text" },
        { name: "Module Version", type: "Single-Line Text" },
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

export const COMPONENT_FORGE_RUN_TEMPLATE: TemplateConfig = {
  name: "ComponentForge Run",
  parentId: SITECORE_IDS.TEMPLATES.USER_DEFINED,
  parentPath: SITECORE_PATHS.TEMPLATES.COMPONENT_FORGE,
  sections: [
    {
      name: "Run Info",
      fields: [
        { name: "RunId", type: "Single-Line Text" },
        { name: "RunDate", type: "Datetime" },
        { name: "RunStatus", type: "Single-Line Text" },
        { name: "UserName", type: "Single-Line Text" },
      ],
    },
    {
      name: "Input",
      fields: [
        { name: "InputSource", type: "Single-Line Text" },
      ],
    },
    {
      name: "Results",
      fields: [
        { name: "GeneratedCode", type: "Multi-Line Text" },
      ],
    },
    {
      name: "Summary",
      fields: [
        { name: "TotalTokensUsed", type: "Integer" },
        { name: "TotalDuration", type: "Integer" },
        { name: "ComponentCount", type: "Integer" },
      ],
    },
  ],
};

export const COMPONENT_FORGE_RUN_STEP_TEMPLATE: TemplateConfig = {
  name: "ComponentForge RunStep",
  parentId: SITECORE_IDS.TEMPLATES.USER_DEFINED,
  parentPath: SITECORE_PATHS.TEMPLATES.COMPONENT_FORGE,
  sections: [
    {
      name: "Step Info",
      fields: [
        { name: "StepName", type: "Single-Line Text" },
        { name: "StepOrder", type: "Integer" },
        { name: "Timestamp", type: "Datetime" },
      ],
    },
    {
      name: "AI Details",
      fields: [
        { name: "Model", type: "Single-Line Text" },
        { name: "PromptTokens", type: "Integer" },
        { name: "CompletionTokens", type: "Integer" },
        { name: "TotalTokens", type: "Integer" },
        { name: "Duration", type: "Integer" },
      ],
    },
  ],
};

export const INSTALLATION_TEMPLATES: TemplateConfig[] = [
  COMPONENT_FORGE_FOLDER_TEMPLATE,
  COMPONENT_FORGE_SETTINGS_TEMPLATE,
  COMPONENT_FORGE_LOGS_FOLDER_TEMPLATE,
  COMPONENT_FORGE_RUN_TEMPLATE,
  COMPONENT_FORGE_RUN_STEP_TEMPLATE,
];
