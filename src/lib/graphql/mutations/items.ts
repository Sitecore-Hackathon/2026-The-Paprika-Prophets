import type { ItemConfig } from "../types";

/** Escape a string for embedding inside a GraphQL string literal (double-quoted). */
function escapeGraphQL(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

export const buildCreateItemMutation = (config: ItemConfig) => {
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
          language: "${config.language || "en"}"
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
