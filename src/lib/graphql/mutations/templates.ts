import type { TemplateConfig } from "../types";

export const buildCreateTemplateMutation = (config: TemplateConfig) => {
  const sectionsBlock = config.sections
    .map((section) => {
      if (section.fields.length === 0) return null;

      const fieldsArray = section.fields
        .map((field) => {
          const title = field.displayName ? `, title: "${field.displayName}"` : "";
          return `{ name: "${field.name}", type: "${field.type}"${title} }`;
        })
        .join("\n          ");

      return `{
        name: "${section.name}"
        fields: [
          ${fieldsArray}
        ]
      }`;
    })
    .filter(Boolean)
    .join("\n      ");

  const sectionsContent = sectionsBlock || `{
        name: "Data"
        fields: []
      }`;

  return `
    mutation {
      createItemTemplate(
        input: {
          name: "${config.name}"
          parent: "${config.parentId}"
          sections: [
            ${sectionsContent}
          ]
        }
      ) {
        itemTemplate {
          name
          templateId
          ownFields {
            nodes {
              name
              type
            }
          }
        }
      }
    }
  `;
};

export const buildDeleteTemplateMutation = (templateId: string) => `
  mutation {
    deleteItem(
      input: {
        itemId: "${templateId}"
        permanently: false
      }
    ) {
      successful
    }
  }
`;
