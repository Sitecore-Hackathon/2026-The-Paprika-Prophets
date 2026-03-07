import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { buildGetItemQuery, buildGetItemWithFieldsQuery } from "@/lib/graphql/queries/items";
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
    return result as GraphQLResponse<T>;
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

  async createTemplate(config: TemplateConfig): Promise<string | null> {
    const mutation = buildCreateTemplateMutation(config);
    const response = await this.executeQuery<CreateTemplateResponse>(mutation);
    return response?.data?.data?.createItemTemplate?.itemTemplate?.templateId ?? null;
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
}
