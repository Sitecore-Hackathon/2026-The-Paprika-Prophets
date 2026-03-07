import type { SitecoreItem } from "@/lib/graphql/types";

export type SiteSettings = {
  RouteBaseTemplate: string | null;
  RenderingsPath: string | null;
  Templates: string | null;
  templatesItem?: SitecoreItem | null;
  renderingsItem?: SitecoreItem | null;
  routeBaseTemplateItem?: SitecoreItem | null;
};
