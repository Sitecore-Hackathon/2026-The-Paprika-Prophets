"use client";

import { useWizard } from "../wizard-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AnalysisResults() {
  const { goBack, data } = useWizard();

  const analysis = data.analysisResult as Record<string, unknown> | undefined;
  const sourceType = (data.sourceType as string) ?? "unknown";
  const screenshotPreview = data.screenshotPreview as string | undefined;

  if (!analysis) {
    return (
      <div className="space-y-6 pt-8">
        <div className="text-center py-12 text-muted-foreground">
          No analysis results yet. Go back and submit a component for analysis.
        </div>
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
      </div>
    );
  }

  const components = (analysis.components as unknown[]) ?? [];
  const componentName = analysis.componentName as string | undefined;

  return (
    <div className="space-y-6 pt-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Analysis Results
        </h1>
        <Badge colorScheme="success">{sourceType}</Badge>
        {components.length > 0 && (
          <Badge colorScheme="primary">
            {components.length} component{components.length !== 1 ? "s" : ""}
          </Badge>
        )}
        {!components.length && componentName && (
          <Badge colorScheme="primary">{componentName}</Badge>
        )}
      </div>

      {screenshotPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Screenshot</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={screenshotPreview}
              alt="Analyzed screenshot"
              className="max-h-64 rounded-lg border"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw JSON Response</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-auto max-h-[600px] whitespace-pre-wrap break-words">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
