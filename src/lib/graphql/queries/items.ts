import { DATABASE } from "@/lib/constants";

export const buildGetItemQuery = (path: string, database: string = DATABASE.MASTER): string => `
  query {
    item(where: { database: "${database}", path: "${path}" }) {
      itemId(format: B)
      name
      path
      children {
        nodes {
          name
          path
          itemId(format: B)
        }
      }
    }
  }
`;

export const buildGetItemByIdQuery = (itemId: string, database: string = DATABASE.MASTER): string => `
  query {
    item(where: { database: "${database}", itemId: "${itemId}" }) {
      itemId(format: B)
      name
      path
    }
  }
`;

export const buildGetChildrenByIdQuery = (itemId: string, database: string = DATABASE.MASTER): string => `
  query {
    item(where: { database: "${database}", itemId: "${itemId}" }) {
      children {
        nodes {
          itemId(format: B)
          name
          path
        }
      }
    }
  }
`;

export const buildGetItemWithFieldsQuery = (
  path: string,
  database: string = DATABASE.MASTER,
): string => `
  query {
    item(where: { database: "${database}", path: "${path}" }) {
      itemId(format: B)
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

