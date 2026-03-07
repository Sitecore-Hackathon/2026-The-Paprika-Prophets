export const buildGetItemQuery = (path: string, database: string = "master") => `
  query {
    item(where: { database: "${database}", path: "${path}" }) {
      itemId
      name
      path
      children {
        nodes {
          name
          path
          itemId
        }
      }
    }
  }
`;

export const buildGetItemByIdQuery = (itemId: string, database: string = "master") => `
  query {
    item(where: { database: "${database}", itemId: "${itemId}" }) {
      itemId
      name
      path
    }
  }
`;

export const buildGetChildrenByIdQuery = (itemId: string, database: string = "master") => `
  query {
    item(where: { database: "${database}", itemId: "${itemId}" }) {
      children {
        nodes {
          itemId
          name
          path
        }
      }
    }
  }
`;

export const buildGetItemWithFieldsQuery = (
  path: string,
  database: string = "master",
) => `
  query {
    item(where: { database: "${database}", path: "${path}" }) {
      itemId
      name
      path
      fields(excludeStandardFields: true) {
        nodes {
          name
          value
        }
      }
    }
  }
`;

export const buildSearchItemsQuery = (
  templateId: string,
  rootPath: string = "/sitecore",
  database: string = "master",
) => `
  query {
    search(
      where: {
        AND: [
          { name: "_path", value: "${rootPath}", operator: CONTAINS }
          { name: "_templatename", value: "${templateId}" }
        ]
      }
      first: 100
    ) {
      results {
        items {
          item {
            itemId
            name
            path
          }
        }
      }
    }
  }
`;
