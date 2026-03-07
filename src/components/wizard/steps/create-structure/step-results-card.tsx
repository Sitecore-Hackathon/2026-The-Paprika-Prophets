"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ItemResult } from "./structure-context";

type Props = {
  results: ItemResult[];
};

export const StepResultsCard = ({ results }: Props) => {
  if (results.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {results.map((r) => (
          <div key={r.originalName} className="flex items-center gap-2 text-sm">
            <Badge colorScheme={r.error ? "danger" : "success"} size="sm">
              {r.error ? "error" : "created"}
            </Badge>
            <span className="font-medium">{r.resolvedName}</span>
            {r.resolvedName !== r.originalName && (
              <span className="text-xs text-muted-foreground">(was: {r.originalName})</span>
            )}
            {r.id && (
              <span className="text-xs text-muted-foreground font-mono">{r.id}</span>
            )}
            {r.error && (
              <span className="text-xs text-destructive">{r.error}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
