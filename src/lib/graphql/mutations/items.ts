import type { ItemConfig } from "../types";

export const buildCreateItemMutation = (config: ItemConfig) => {
  const fields = config.fields
    ? config.fields.map((f) => `{ name: "${f.name}", value: "${f.value}" }`).join("\n        ")
    : "";

  const fieldsBlock = fields ? `fields: [\n        ${fields}\n      ]` : "";

  return `
    mutation {
      createItem(
        input: {
          name: "${config.name}"
          templateId: "${config.templateId}"
          parent: "${config.parentId}"
          language: "${config.language || "en"}"
          ${fieldsBlock}
        }
      ) {
        item {
          itemId
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

export const buildDeleteItemMutation = (path: string, permanently: boolean = false) => `
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
) => {
  const fieldUpdates = fields
    .map((f) => `{ name: "${f.name}", value: "${f.value}" }`)
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
          itemId
          name
          path
        }
      }
    }
  `;
};
