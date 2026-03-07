export type GraphQLResponse<T = unknown> = {
  data?: {
    data?: T;
    errors?: Array<{
      message: string;
      locations?: Array<{ line: number; column: number }>;
      path?: (string | number)[];
      extensions?: Record<string, unknown>;
    }>;
  };
};

export type SitecoreItem = {
  itemId: string;
  name: string;
  path: string;
  templateId?: string;
  templateName?: string;
  fields?: { nodes: Array<{ name: string; value: string }> };
  children?: { nodes: SitecoreItem[] };
};

export type FieldConfig = {
  name: string;
  displayName?: string;
  type: string;
  source?: string;
  value?: string;
};

export type SectionConfig = {
  name: string;
  fields: FieldConfig[];
};

export type TemplateConfig = {
  name: string;
  parentId: string;
  parentPath: string;
  language?: string;
  sections: SectionConfig[];
  baseTemplateIds?: string[];
  createStandardValuesItem?: boolean;
};

export type ItemConfig = {
  name: string;
  templateId: string;
  parentId: string;
  parentPath: string;
  language?: string;
  fields?: Array<{ name: string; value: string }>;
};

export type DeleteItemResponse = {
  deleteItem: { successful: boolean };
};

export type CreateItemResponse = {
  createItem: { item: SitecoreItem };
};

export type CreateTemplateResponse = {
  createItemTemplate: {
    itemTemplate: {
      templateId: string;
      name: string;
      path?: string;
      standardValuesItem?: { itemId: string };
      ownFields?: { nodes: Array<{ name: string; type: string; fieldId?: string }> };
    };
  };
};
