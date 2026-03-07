export type ComponentField = {
  name: string;
  displayName: string;
  type: string;
  description: string;
  source: string;
};



export const REFERENCE_FIELD_TYPES = new Set(["Treelist", "Multilist", "Droptree", "Droplink"]);

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
}

export type TemplateGroup = {
  id: string;
  label: string;
  type: "list" | "standalone";
  members: { role: "parent" | "child" | "folder" | "standalone"; idx: number }[];
  insertOptions: string[];
};