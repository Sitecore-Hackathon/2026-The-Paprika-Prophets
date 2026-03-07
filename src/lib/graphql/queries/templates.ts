export const buildGetTemplateQuery = (path: string, database: string = "master") => `
  query {
    item(where: { database: "${database}", path: "${path}" }) {
      itemId
      name
      path
    }
  }
`;

export const buildGetTemplateByIdQuery = (templateId: string) => `
  query {
    itemTemplate(id: "${templateId}") {
      templateId
      name
      ownFields {
        nodes {
          name
          type
          fieldId
        }
      }
    }
  }
`;
