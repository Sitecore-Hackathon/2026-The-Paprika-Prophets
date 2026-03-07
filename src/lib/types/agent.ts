import type { SitecoreItem } from "@/lib/types/graphql";

export type SiteSettings = {
  RouteBaseTemplate: string | null;
  RenderingsPath: string | null;
  Templates: string | null;
  AppDatasourcesPath: string | null;
  templatesItem?: SitecoreItem | null;
  renderingsItem?: SitecoreItem | null;
  routeBaseTemplateItem?: SitecoreItem | null;
  appDatasourcesItem?: SitecoreItem | null;
};
