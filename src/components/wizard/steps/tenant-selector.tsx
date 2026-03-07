"use client";

import { useAppContext } from "@/components/providers/marketplace-provider";
import { useTenantContext } from "@/components/providers/tenant-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteSelector } from "./site-selector";

export function TenantSelector() {
  const appContext = useAppContext();
  const { selectedTenant, setSelectedTenant } = useTenantContext();

  const tenants = appContext.resourceAccess;

  const handleSelect = (displayName: string) => {
    const tenant = tenants?.find((t) => t.tenantDisplayName === displayName);
    setSelectedTenant(tenant ?? null);
  };

  return (
    <div className="flex flex-col items-center space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Select Tenant
        </h1>
        <p className="text-muted-foreground mt-1">
          Choose the tenant and site you want to work with.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={selectedTenant?.tenantDisplayName ?? ""}
            onValueChange={handleSelect}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants?.map((tenant, idx) => (
                <SelectItem key={idx} value={tenant.tenantDisplayName ?? ""}>
                  {tenant.tenantDisplayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Site selector appears once a tenant is chosen */}
      <SiteSelector />
    </div>
  );
}
