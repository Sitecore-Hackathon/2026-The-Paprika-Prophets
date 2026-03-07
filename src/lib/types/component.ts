export type ComponentField = {
  name: string;
  displayName: string;
  type: string;
  description: string;
  source: string;
};

export const REFERENCE_FIELD_TYPES = new Set(["Treelist", "Multilist", "Droptree", "Droplink"]);

export type DesignHints = {
  layout: string;
  colors: string;
  typography: string;
  spacing: string;
  borders: string;
  shadows: string;
  backgroundStyle: string;
  iconography: string;
  responsiveHint: string;
};

export type AnalyzedComponent = {
  componentName: string;
  description: string;
  visualLocation: string;
  isListComponent: boolean;
  childTemplateName: string | null;
  isDatasourceFolder: boolean;
  parentTemplateName: string | null;
  fields: ComponentField[];
  suggestions: string;
  designHints: DesignHints | null;
}

export type TemplateGroup = {
  id: string;
  label: string;
  type: "list" | "standalone";
  members: { role: "parent" | "child" | "folder" | "standalone"; idx: number }[];
  insertOptions: string[];
};