"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useWizard } from "../../wizard-context";
import { useTenantContext } from "@/components/providers/tenant-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AnalysisLoader } from "../../analysis-loader";
import type {
  AnalyzedComponent,
  ComponentField,
} from "@/lib/types/component";
import { useRunLog } from "@/components/providers/run-log-provider";
import type { AiCallMetadata } from "@/lib/services/logging-service";
import { dataUrlToBlob } from "@/lib/utils/string";
import { HEADERS } from "@/lib/constants";
import {
  normalizeComponents,
  emptyField,
} from "@/lib/utils/normalize-components";
import { buildGroups } from "@/lib/utils/template-grouping";
import { RoleLabel, ROLE_DOT_COLORS } from "./role-badges";
import { TemplateEditorCard } from "./template-editor-card";
import { ReanalyzeCard } from "./reanalyze-card";

export const AnalysisResults = () => {
  const { goBack, goNext, data, setStepData } = useWizard();
  const { selectedTenant } = useTenantContext();
  const { recordStep } = useRunLog();

  const analysisRaw = data.analysisResult as
    | Record<string, unknown>
    | undefined;
  const sourceType = (data.sourceType as string) ?? "unknown";
  const screenshotPreview = data.screenshotPreview as string | undefined;
  const openAiApiKey = (data.openAiApiKey as string) ?? "";
  const pageSuggestions = analysisRaw
    ? String(
        (analysisRaw as Record<string, unknown>).pageSuggestions ?? "",
      )
    : "";

  const [components, setComponents] = useState<AnalyzedComponent[]>(() =>
    analysisRaw ? normalizeComponents(analysisRaw) : [],
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [reanalyzing, setReanalyzing] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(
    new Set(),
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  const templateGroups = useMemo(
    () => buildGroups(components),
    [components],
  );

  useEffect(() => {
    if (templateGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(templateGroups.map((g) => g.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on initial grouping
  }, [templateGroups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── CRUD helpers ──────────────────────────────────────────── */

  const updateField = (
    compIdx: number,
    fieldIdx: number,
    key: keyof ComponentField,
    value: string,
  ) => {
    setComponents((prev) => {
      const next = [...prev];
      next[compIdx] = {
        ...next[compIdx],
        fields: [...next[compIdx].fields],
      };
      next[compIdx].fields[fieldIdx] = {
        ...next[compIdx].fields[fieldIdx],
        [key]: value,
      };
      return next;
    });
  };

  const removeField = (compIdx: number, fieldIdx: number) => {
    setComponents((prev) => {
      const next = [...prev];
      next[compIdx] = {
        ...next[compIdx],
        fields: next[compIdx].fields.filter((_, i) => i !== fieldIdx),
      };
      return next;
    });
  };

  const addField = (compIdx: number) => {
    setComponents((prev) => {
      const next = [...prev];
      next[compIdx] = {
        ...next[compIdx],
        fields: [...next[compIdx].fields, emptyField()],
      };
      return next;
    });
  };

  const updateComponentName = (compIdx: number, name: string) => {
    setComponents((prev) => {
      const next = [...prev];
      next[compIdx] = { ...next[compIdx], componentName: name };
      return next;
    });
  };

  const totalTemplates = components.length;
  const totalFields = components.reduce(
    (s, c) => s + c.fields.length,
    0,
  );

  /* ── Reanalyze ─────────────────────────────────────────────── */

  const togglePreset = (preset: string) =>
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(preset)) next.delete(preset);
      else next.add(preset);
      return next;
    });

  const handleReanalyze = useCallback(async () => {
    const parts: string[] = [...selectedPresets];
    if (feedbackText.trim()) parts.push(feedbackText.trim());
    const feedback = parts.join(". ");
    if (!feedback) return;

    setReanalyzing(true);
    setReanalyzeError(null);

    try {
      let json: {
        success: boolean;
        analysis: Record<string, unknown>;
        error?: string;
        metadata?: AiCallMetadata;
      };

      if (sourceType === "screenshot" && screenshotPreview) {
        const blob = dataUrlToBlob(screenshotPreview);
        const formData = new FormData();
        formData.append("image", blob, "screenshot.png");
        formData.append("feedback", feedback);
        formData.append("previousResult", JSON.stringify(analysisRaw));

        const response = await fetch("/api/analyze-screenshot", {
          method: "POST",
          body: formData,
          headers: {
            [HEADERS.TENANT_ID]: selectedTenant?.tenantId ?? "unknown",
            ...(openAiApiKey
              ? { [HEADERS.OPENAI_KEY]: openAiApiKey }
              : {}),
            ...((data.analysisLlmModel as string)
              ? {
                  [HEADERS.ANALYSIS_MODEL]: data.analysisLlmModel as string,
                }
              : {}),
          },
        });
        json = await response.json();
        if (!response.ok)
          throw new Error(json.error || "Re-analysis failed");
      } else {
        const htmlContent = (data.htmlContent as string) ?? "";
        const response = await fetch("/api/analyze-html", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [HEADERS.TENANT_ID]: selectedTenant?.tenantId ?? "unknown",
            ...(openAiApiKey
              ? { [HEADERS.OPENAI_KEY]: openAiApiKey }
              : {}),
            ...((data.analysisLlmModel as string)
              ? {
                  [HEADERS.ANALYSIS_MODEL]: data.analysisLlmModel as string,
                }
              : {}),
          },
          body: JSON.stringify({
            html: htmlContent,
            feedback,
            previousResult: analysisRaw,
          }),
        });
        json = await response.json();
        if (!response.ok)
          throw new Error(json.error || "Re-analysis failed");
      }

      if (json.metadata) recordStep(json.metadata);

      setStepData("analysisResult", json.analysis);
      setComponents(normalizeComponents(json.analysis));
      setSelectedPresets(new Set());
      setFeedbackText("");
    } catch (err: unknown) {
      setReanalyzeError(
        err instanceof Error ? err.message : "Re-analysis failed",
      );
    } finally {
      setReanalyzing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sourceType,
    screenshotPreview,
    analysisRaw,
    data.htmlContent,
    openAiApiKey,
    selectedTenant,
    setStepData,
    selectedPresets,
    feedbackText,
    recordStep,
  ]);

  /* ── No data guard ─────────────────────────────────────────── */

  if (!analysisRaw) {
    return (
      <div className="space-y-6 pt-8">
        <div className="text-center py-12 text-muted-foreground">
          No analysis results yet. Go back and submit a component for
          analysis.
        </div>
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 pt-8">
      {reanalyzing && <AnalysisLoader label="Re-analyzing with feedback" />}

      {/* ═══ Template Overview Card ═══ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">
                Components Overview
              </CardTitle>
              <CardDescription>
                {totalTemplates} template
                {totalTemplates !== 1 ? "s" : ""} detected ({totalFields}{" "}
                fields total) — review and edit before creating
              </CardDescription>
            </div>
            <Badge colorScheme="neutral">
              {sourceType === "screenshot" ? "From Screenshot" : "From HTML"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            {screenshotPreview && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  Source
                </h4>
                <img
                  src={screenshotPreview}
                  alt="Analyzed screenshot"
                  className="w-full rounded-lg border"
                />
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Template Structure
              </h4>
              {templateGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-muted/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {group.type === "list" ? (
                      <Badge colorScheme="primary" size="sm">
                        List Component
                      </Badge>
                    ) : (
                      <Badge colorScheme="neutral" size="sm">
                        Standalone
                      </Badge>
                    )}
                    <span className="font-semibold text-sm">
                      {group.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5 ml-1">
                    {group.members.map((m) => {
                      const comp = components[m.idx];
                      return (
                        <div
                          key={m.idx}
                          className="flex items-center gap-2"
                        >
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${ROLE_DOT_COLORS[m.role] ?? "bg-gray-400"}`}
                          />
                          <RoleLabel role={m.role} />
                          <span className="font-medium">
                            {comp.componentName}
                          </span>
                          <span className="text-muted-foreground">
                            ({comp.fields.length} field
                            {comp.fields.length !== 1 ? "s" : ""})
                          </span>
                        </div>
                      );
                    })}
                    {group.insertOptions.map((opt, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 mt-1 text-xs"
                      >
                        <span className="text-amber-600 dark:text-amber-400">
                          ⚡
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pageSuggestions && (
            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-semibold mb-1">AI Suggestions</h4>
              <p className="text-sm text-muted-foreground">
                {pageSuggestions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Per-group template editors ═══ */}
      {templateGroups.map((group) => (
        <TemplateEditorCard
          key={group.id}
          group={group}
          components={components}
          expanded={expandedGroups.has(group.id)}
          onToggle={() => toggleGroup(group.id)}
          onUpdateField={updateField}
          onRemoveField={removeField}
          onAddField={addField}
          onUpdateComponentName={updateComponentName}
        />
      ))}

      <Separator />

      <ReanalyzeCard
        selectedPresets={selectedPresets}
        onTogglePreset={togglePreset}
        feedbackText={feedbackText}
        onFeedbackChange={setFeedbackText}
        error={reanalyzeError}
        loading={reanalyzing}
        onReanalyze={handleReanalyze}
      />

      {/* ═══ Navigation ═══ */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button
          onClick={() => {
            setStepData("editedComponents", components);
            setStepData("templateGroups", templateGroups);
            goNext();
          }}
        >
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
};
