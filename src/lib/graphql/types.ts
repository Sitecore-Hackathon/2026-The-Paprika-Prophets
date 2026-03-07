export interface GraphQLResponse<T = unknown> {
  data?: {
    data?: T;
    errors?: Array<{
      message: string;
      locations?: Array<{ line: number; column: number }>;
      path?: (string | number)[];
      extensions?: Record<string, unknown>;
    }>;
  };
}

export interface SitecoreItem {
  itemId: string;
  name: string;
  path: string;
  templateId?: string;
  templateName?: string;
  fields?: {
    nodes: Array<{
      name: string;
      value: string;
    }>;
  };
  children?: {
    nodes: SitecoreItem[];
  };
}

export interface SitecoreTemplate {
  templateId: string;
  name: string;
  path?: string;
  standardValuesItem?: { itemId: string };
  ownFields?: {
    nodes: Array<{
      name: string;
      type: string;
      fieldId?: string;
    }>;
  };
  sections?: {
    nodes: Array<{
      name: string;
      fields: {
        nodes: Array<{
          name: string;
          type: string;
        }>;
      };
    }>;
  };
}

export interface FieldConfig {
  name: string;
  displayName?: string;
  type: string;
  value?: string;
}

export interface SectionConfig {
  name: string;
  fields: FieldConfig[];
}

export interface TemplateConfig {
  name: string;
  parentId: string;
  parentPath: string;
  language?: string;
  sections: SectionConfig[];
  baseTemplateIds?: string[];
  createStandardValuesItem?: boolean;
}

export interface ItemConfig {
  name: string;
  templateId: string;
  parentId: string;
  parentPath: string;
  language?: string;
  fields?: Array<{
    name: string;
    value: string;
  }>;
}

export interface DeleteItemResponse {
  deleteItem: {
    successful: boolean;
  };
}

export interface CreateItemResponse {
  createItem: {
    item: SitecoreItem;
  };
}

export interface CreateTemplateResponse {
  createItemTemplate: {
    itemTemplate: SitecoreTemplate;
  };
}
