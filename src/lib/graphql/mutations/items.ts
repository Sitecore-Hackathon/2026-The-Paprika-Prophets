import type { ItemConfig } from "../../types/graphql";
import { DEFAULT_LANGUAGE } from "@/lib/constants";

export const buildCreateItemMutation = (config: ItemConfig): string => {
  const fields = config.fields
    ? config.fields.map((f) => `{ name: "${escapeGraphQL(f.name)}", value: "${escapeGraphQL(f.value)}" }`).join("\n        ")
    : "";

  const fieldsBlock = fields ? `fields: [\n        ${fields}\n      ]` : "";

  return `
    mutation {
      createItem(
        input: {
          name: "${escapeGraphQL(config.name)}"
          templateId: "${config.templateId}"
          parent: "${config.parentId}"
          language: "${config.language ?? DEFAULT_LANGUAGE}"
          ${fieldsBlock}
        }
      ) {
        item {
          itemId (format: B)
          name
          path
          fields(ownFields: true, excludeStandardFields: true) {
            nodes {
              name
              value
            }
          }
        }
      }
    }
  `;
};

export const buildDeleteItemMutation = (path: string, permanently: boolean = false): string => `
  mutation {
    deleteItem(
      input: {
        path: "${path}"
        permanently: ${permanently}
      }
    ) {
      successful
    }
  }
`;

export const buildUpdateItemFieldsMutation = (
  itemId: string,
  language: string,
  fields: Array<{ name: string; value: string }>,
): string => {
  const fieldUpdates = fields
    .map((f) => `{ name: "${escapeGraphQL(f.name)}", value: "${escapeGraphQL(f.value)}" }`)
    .join("\n        ");

  return `
    mutation {
      updateItem(
        input: {
          itemId: "${itemId}"
          language: "${language}"
          fields: [
            ${fieldUpdates}
          ]
        }
      ) {
        item {
          itemId (format: B)
          name
          path
        }
      }
    }
  `;
};

function escapeGraphQL(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
