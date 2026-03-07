"use client";

import { Badge } from "@/components/ui/badge";
import type { TemplateMemberRole } from "@/lib/types/component";

export const ROLE_DOT_COLORS: Record<TemplateMemberRole, string> = {
  parent: "bg-blue-500",
  child: "bg-green-500",
  folder: "bg-amber-500",
  standalone: "bg-teal-500",
};

export const RoleBadge = ({ role }: { role: TemplateMemberRole }) => {
  const config: Record<string, { label: string; colorScheme: string }> = {
    parent: { label: "Parent", colorScheme: "primary" },
    child: { label: "Child", colorScheme: "success" },
    folder: { label: "Folder", colorScheme: "warning" },
    standalone: { label: "Template", colorScheme: "neutral" },
  };
  const c = config[role] ?? { label: role, colorScheme: "neutral" };
  return (
    <Badge
      colorScheme={c.colorScheme as "primary" | "success" | "warning" | "neutral"}
      size="sm"
    >
      {c.label}
    </Badge>
  );
};

export const RoleLabel = ({ role }: { role: TemplateMemberRole }) => {
  const labels: Record<string, string> = {
    parent: "Parent:",
    child: "Child:",
    folder: "Folder:",
    standalone: "Template:",
  };
  return <span className="text-muted-foreground">{labels[role] ?? role}</span>;
};
