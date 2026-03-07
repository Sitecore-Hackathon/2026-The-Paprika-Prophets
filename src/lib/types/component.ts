export type ComponentField = {
  name: string;
  displayName: string;
  type: string;
  description: string;
  required: boolean;
  source: string;
};

export type VariantDef = {
  name: string;
  description: string;
};

export type SxaStyleDef = {
  name: string;
  options: string[];
  description: string;
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
  variants: VariantDef[];
  sxaStyles: SxaStyleDef[];
  suggestions: string;
};

export type TemplateGroup = {
  id: string;
  label: string;
  type: "list" | "standalone";
  members: { role: "parent" | "child" | "folder" | "standalone"; idx: number }[];
  insertOptions: string[];
};

export const REFERENCE_FIELD_TYPES = new Set([
  "Treelist",
  "Multilist",
  "Droptree",
  "Droplink",
]);
