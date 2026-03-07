import type { TemplateConfig } from "../../types/graphql";
import { DEFAULT_LANGUAGE } from "@/lib/constants";

export const buildCreateTemplateMutation = (config: TemplateConfig): string => {
  const language = config.language ?? DEFAULT_LANGUAGE;

  const sectionsBlock = config.sections
    .map((section) => {
      if (section.fields.length === 0) return null;
      const fieldsArray = section.fields
        .map((field) => {
          const title = field.displayName ? `, title: "${field.displayName}"` : "";
          const source = field.source ? `, source: "${field.source}"` : "";
          return `{ name: "${field.name}", type: "${field.type}"${title}${source} }`;
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

  const baseTemplatesBlock = config.baseTemplateIds?.length
    ? `baseTemplates: [${config.baseTemplateIds.map((id) => `"${id}"`).join(", ")}]`
    : "";

  const createStandardValuesItem = config.createStandardValuesItem !== undefined
    ? `createStandardValuesItem: ${config.createStandardValuesItem}`
    : "";

  return `
    mutation {
      createItemTemplate(
        input: {
          name: "${config.name}"
          parent: "${config.parentId}"
          language: "${language}"
          ${createStandardValuesItem}
          ${baseTemplatesBlock}
          sections: [
            ${sectionsBlock}
          ]
        }
      ) {
        itemTemplate {
          name
          templateId (format: B)
          standardValuesItem(language: "${language}") {
            itemId
          }
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
