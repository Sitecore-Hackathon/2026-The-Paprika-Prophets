"use client";

import { useTenantContext } from "@/components/providers/tenant-provider";
import { Badge } from "@/components/ui/badge";

export function TenantHeader() {
  const { selectedTenant } = useTenantContext();

  if (!selectedTenant) {
    return null;
  }

  return (
    <div className="border-b bg-muted/40">
      <div className="container mx-auto px-6 py-3 flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Selected Tenant:
        </span>
        <Badge>{selectedTenant.tenantDisplayName}</Badge>
      </div>
    </div>
  );
}
