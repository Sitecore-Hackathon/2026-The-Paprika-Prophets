import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { buildGetItemQuery, buildGetItemWithFieldsQuery, buildGetItemByIdQuery, buildGetChildrenByIdQuery } from "@/lib/graphql/queries/items";
import { buildGetTemplateQuery } from "@/lib/graphql/queries/templates";
import {
  buildCreateItemMutation,
  buildDeleteItemMutation,
  buildUpdateItemFieldsMutation,
} from "@/lib/graphql/mutations/items";
import {
  buildCreateTemplateMutation,
  buildDeleteTemplateMutation,
} from "@/lib/graphql/mutations/templates";
import type {
  GraphQLResponse,
  SitecoreItem,
  TemplateConfig,
  ItemConfig,
  CreateTemplateResponse,
  CreateItemResponse,
  DeleteItemResponse,
} from "@/lib/graphql/types";

export class AuthoringService {
  constructor(
    private client: ClientSDK,
    private sitecoreContextId: string,
  ) {}

  private async executeQuery<T>(query: string): Promise<GraphQLResponse<T>> {
    const result = await this.client.mutate("xmc.authoring.graphql", {
      params: {
        query: {
          sitecoreContextId: this.sitecoreContextId,
        },
        body: { query },
      },
    });
    const response = result as GraphQLResponse<T>;
    const gqlErrors = response?.data?.errors;
    if (gqlErrors?.length) {
      throw new Error(gqlErrors.map((e) => e.message).join("; "));
    }
    return response;
  }

  async getItem(path: string, database: string = "master"): Promise<SitecoreItem | null> {
    const query = buildGetItemQuery(path, database);
    const response = await this.executeQuery<{ item: SitecoreItem }>(query);
    return response?.data?.data?.item ?? null;
  }

  async getItemWithFields(
    path: string,
    database: string = "master",
  ): Promise<SitecoreItem | null> {
    const query = buildGetItemWithFieldsQuery(path, database);
    const response = await this.executeQuery<{ item: SitecoreItem }>(query);
    return response?.data?.data?.item ?? null;
  }

  async createItem(config: ItemConfig): Promise<SitecoreItem | null> {
    const mutation = buildCreateItemMutation(config);
    const response = await this.executeQuery<CreateItemResponse>(mutation);
    return response?.data?.data?.createItem?.item ?? null;
  }

  async deleteItem(path: string, permanently: boolean = false): Promise<boolean> {
    const mutation = buildDeleteItemMutation(path, permanently);
    const response = await this.executeQuery<DeleteItemResponse>(mutation);
    return response?.data?.data?.deleteItem?.successful ?? false;
  }

  async updateItemFields(
    itemId: string,
    language: string,
    fields: Array<{ name: string; value: string }>,
  ): Promise<SitecoreItem | null> {
    const mutation = buildUpdateItemFieldsMutation(itemId, language, fields);
    const response = await this.executeQuery<{ updateItem: { item: SitecoreItem } }>(mutation);
    return response?.data?.data?.updateItem?.item ?? null;
  }

  async getTemplate(path: string, database: string = "master"): Promise<SitecoreItem | null> {
    const query = buildGetTemplateQuery(path, database);
    const response = await this.executeQuery<{ item: SitecoreItem }>(query);
    return response?.data?.data?.item ?? null;
  }

  async createTemplate(config: TemplateConfig): Promise<{ templateId: string; standardValuesItemId: string | null }> {
    const mutation = buildCreateTemplateMutation(config);
    const response = await this.executeQuery<CreateTemplateResponse>(mutation);
    const itemTemplate = response?.data?.data?.createItemTemplate?.itemTemplate;
    const templateId = itemTemplate?.templateId;
    if (!templateId) throw new Error(`Mutation succeeded but returned no template ID for "${config.name}"`);
    return { templateId, standardValuesItemId: itemTemplate?.standardValuesItem?.itemId ?? null };
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const mutation = buildDeleteTemplateMutation(templateId);
    const response = await this.executeQuery<DeleteItemResponse>(mutation);
    return response?.data?.data?.deleteItem?.successful ?? false;
  }

  async itemExists(path: string): Promise<boolean> {
    const item = await this.getItem(path);
    return item !== null;
  }

  async getItemById(itemId: string, database: string = "master"): Promise<SitecoreItem | null> {
    const query = buildGetItemByIdQuery(itemId, database);
    const response = await this.executeQuery<{ item: SitecoreItem }>(query);
    return response?.data?.data?.item ?? null;
  }

  async getChildrenById(itemId: string, database: string = "master"): Promise<SitecoreItem[]> {
    const query = buildGetChildrenByIdQuery(itemId, database);
    const response = await this.executeQuery<{ item: SitecoreItem }>(query);
    return response?.data?.data?.item?.children?.nodes ?? [];
  }

  async getUniqueName(parentId: string, desiredName: string, database: string = "master"): Promise<string> {
    const children = await this.getChildrenById(parentId, database);
    const existingNames = children.map((c) => c.name);

    let candidate = desiredName;
    let index = 1;
    while (existingNames.includes(candidate)) {
      candidate = `${desiredName} ${index++}`;
    }

    return candidate;
  }
}
