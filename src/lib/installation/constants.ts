export const SITECORE_PATHS = {
  TEMPLATES: {
    ROOT: "/sitecore/templates",
    USER_DEFINED: "/sitecore/templates/User Defined",
    COMPONENT_FORGE: "/sitecore/templates/User Defined/Component Forge",
  },
  SYSTEM: {
    ROOT: "/sitecore/system",
    MODULES: "/sitecore/system/Modules",
  },
  CONTENT: {
    ROOT: "/sitecore/content",
    HOME: "/sitecore/content/Home",
  },
  MODULE: {
    ROOT: "/sitecore/system/Modules/Component Forge",
    SETTINGS: "/sitecore/system/Modules/Component Forge/Settings",
    LOGS: "/sitecore/system/Modules/Component Forge/Logs",
  },
} as const;

export const SITECORE_IDS = {
  TEMPLATES: {
    USER_DEFINED: "{B29EE504-861C-492F-95A3-0D890B6FCA09}",
    FOLDER_TEMPLATE: "{0437FEE2-44C9-46A6-ABE9-28858D9FEE8C}",
  },
  SYSTEM: {
    MODULES: "{08477468-D438-43D4-9D6A-6D84A611971C}",
  },
  CONTENT: {
    HOME: "{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}",
  },
} as const;