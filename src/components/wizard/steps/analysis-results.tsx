"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useWizard } from "../wizard-context";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AnalysisLoader } from "../analysis-loader";
import type {
  ComponentField,
  AnalyzedComponent,
  TemplateGroup,
} from "@/lib/types/component";
import { REFERENCE_FIELD_TYPES } from "@/lib/types/component";
import { useRunLog } from "@/components/providers/run-log-provider";
import type { AiCallMetadata } from "@/lib/services/logging-service";

/* ── Utilities ─────────────────────────────────────────────────────── */

/** Convert a data-URL to a Blob without fetch (avoids CSP connect-src). */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/* ── Types ────────────────────────────────────────────────────────── */

// Types imported from @/lib/types/component



/** A group of related templates: parent list + child + folder, or standalone */
// TemplateGroup is imported from @/lib/types/component

/* ── Constants ────────────────────────────────────────────────────── */

const SITECORE_FIELD_TYPES = [
  "Single-Line Text",
  "Multi-Line Text",
  "Rich Text",
  "Integer",
  "Number",
  "Checkbox",
  "Date",
  "Datetime",
  "Image",
  "File",
  "General Link",
  "Droptree",
  "Multilist",
  "Treelist",
  "Droplink",
  "Name Value List",
];

const REANALYZE_PRESETS = [
  "Treat as a single component",
  "Split into more components",
  "More detailed fields",
  "Simplify — fewer fields",
  "Focus on list / repeater patterns",
] as const;

/* ── Normalization ────────────────────────────────────────────────── */

function normalizeComponents(raw: Record<string, unknown>): AnalyzedComponent[] {
  const list: Record<string, unknown>[] = Array.isArray(raw.components)
    ? (raw.components as Record<string, unknown>[])
    : [raw];

  const normalized = list.map((c) => ({
    componentName: String(c.componentName ?? c.name ?? "Unnamed"),
    description: String(c.description ?? ""),
    visualLocation: String(c.visualLocation ?? ""),
    isListComponent: Boolean(c.isListComponent ?? false),
    childTemplateName: c.childTemplateName ? String(c.childTemplateName) : null,
    isDatasourceFolder: Boolean(c.isDatasourceFolder ?? false),
    parentTemplateName: c.parentTemplateName ? String(c.parentTemplateName) : null,
    fields: normalizeFields(c.fields),
    suggestions: normalizeSuggestions(c.suggestions),
  }));

  // Auto-populate source for Treelist/Multilist fields on list parents
  for (const comp of normalized) {
    if (comp.isListComponent && comp.childTemplateName) {
      for (const field of comp.fields) {
        if (REFERENCE_FIELD_TYPES.has(field.type) && !field.source) {
          field.source = `query:./*`;
        }
      }
    }
  }

  return normalized;
}

function normalizeFields(raw: unknown): ComponentField[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((f) => ({
    name: String(f.name ?? ""),
    displayName: String(f.displayName ?? f.name ?? ""),
    type: String(f.type ?? "Single-Line Text"),
    description: String(f.description ?? ""),
    source: String(f.source ?? ""),
  }));
}

function normalizeSuggestions(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return (raw as unknown[]).map((s) => typeof s === "string" ? s : String((s as Record<string, unknown>).description ?? (s as Record<string, unknown>).name ?? s)).join(". ");
  return "";
}

function emptyField(): ComponentField {
  return { name: "", displayName: "", type: "Single-Line Text", description: "", source: "" };
}

/* ── Grouping logic ───────────────────────────────────────────────── */

function buildGroups(components: AnalyzedComponent[]): TemplateGroup[] {
  const groups: TemplateGroup[] = [];
  const claimed = new Set<number>();

  // First pass: list parents and their children + folders
  components.forEach((comp, idx) => {
    if (comp.isListComponent && !claimed.has(idx)) {
      const group: TemplateGroup = {
        id: comp.componentName,
        label: comp.componentName,
        type: "list",
        members: [{ role: "parent", idx }],
        insertOptions: [],
      };
      claimed.add(idx);

      // Find child
      const childIdx = components.findIndex(
        (c, i) =>
          !claimed.has(i) &&
          !c.isListComponent &&
          !c.isDatasourceFolder &&
          (c.parentTemplateName === comp.componentName || comp.childTemplateName === c.componentName)
      );
      if (childIdx !== -1) {
        group.members.push({ role: "child", idx: childIdx });
        claimed.add(childIdx);
      }

      // Find folder
      const folderIdx = components.findIndex(
        (c, i) =>
          !claimed.has(i) &&
          c.isDatasourceFolder &&
          (c.parentTemplateName === comp.componentName || c.componentName.includes("Folder"))
      );
      if (folderIdx !== -1) {
        group.members.push({ role: "folder", idx: folderIdx });
        claimed.add(folderIdx);
      }

      // Insert options — reusable items pattern
      const folderName = folderIdx !== -1 ? components[folderIdx].componentName : null;
      const childName = childIdx !== -1 ? components[childIdx].componentName : comp.childTemplateName;
      const parentFolderName = comp.componentName + "sFolder";
      if (childName && folderName) group.insertOptions.push(`${childName} → inserted into ${folderName}`);
      group.insertOptions.push(`${comp.componentName} → inserted into ${parentFolderName}`);
      if (childName) group.insertOptions.push(`${comp.componentName}.Items → references ${childName} from $site/Data/${childName}s`);

      groups.push(group);
    }
  });

  // Second pass: standalones (may include a data folder)
  components.forEach((comp, idx) => {
    if (!claimed.has(idx) && !comp.isDatasourceFolder) {
      const group: TemplateGroup = {
        id: comp.componentName,
        label: comp.componentName,
        type: "standalone",
        members: [{ role: "standalone", idx }],
        insertOptions: [],
      };
      claimed.add(idx);

      // Find an associated data folder for this standalone component
      const folderIdx = components.findIndex(
        (c, i) =>
          !claimed.has(i) &&
          c.isDatasourceFolder &&
          (c.parentTemplateName === comp.componentName || c.componentName.includes(comp.componentName))
      );
      if (folderIdx !== -1) {
        group.members.push({ role: "folder", idx: folderIdx });
        claimed.add(folderIdx);
        group.insertOptions.push(
          `${comp.componentName} → datasource stored in ${components[folderIdx].componentName}`
        );
      }

      groups.push(group);
    }
  });

  // Third pass: any unclaimed folders (orphans)
  components.forEach((comp, idx) => {
    if (!claimed.has(idx)) {
      groups.push({
        id: comp.componentName,
        label: comp.componentName,
        type: "standalone",
        members: [{ role: "folder", idx }],
        insertOptions: [],
      });
      claimed.add(idx);
    }
  });

  return groups;
}

/* ── Small UI helpers ─────────────────────────────────────────────── */

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; colorScheme: string }> = {
    parent: { label: "Parent", colorScheme: "primary" },
    child: { label: "Child", colorScheme: "success" },
    folder: { label: "Folder", colorScheme: "warning" },
    standalone: { label: "Template", colorScheme: "neutral" },
  };
  const c = config[role] ?? { label: role, colorScheme: "neutral" };
  return <Badge colorScheme={c.colorScheme as "primary" | "success" | "warning" | "neutral"} size="sm">{c.label}</Badge>;
}

function RoleLabel({ role }: { role: string }) {
  const labels: Record<string, string> = { parent: "Parent:", child: "Child:", folder: "Folder:", standalone: "Template:" };
  return <span className="text-muted-foreground">{labels[role] ?? role}</span>;
}

const ROLE_DOT_COLORS: Record<string, string> = {
  parent: "bg-blue-500",
  child: "bg-green-500",
  folder: "bg-amber-500",
  standalone: "bg-teal-500",
};

/* ── Main Export ──────────────────────────────────────────────────── */

export function AnalysisResults() {
  const { goBack, goNext, data, setStepData } = useWizard();
  const { selectedTenant } = useTenantContext();
  const { recordStep } = useRunLog();

  const analysisRaw = data.analysisResult as Record<string, unknown> | undefined;
  const sourceType = (data.sourceType as string) ?? "unknown";
  const screenshotPreview = data.screenshotPreview as string | undefined;
  const openAiApiKey = (data.openAiApiKey as string) ?? "";
  const pageSuggestions = analysisRaw ? String((analysisRaw as Record<string, unknown>).pageSuggestions ?? "") : "";

  const [components, setComponents] = useState<AnalyzedComponent[]>(() =>
    analysisRaw ? normalizeComponents(analysisRaw) : []
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [reanalyzing, setReanalyzing] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [feedbackText, setFeedbackText] = useState("");
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  // Build groups from components
  const templateGroups = useMemo(() => buildGroups(components), [components]);

  // Expand all groups by default on first render
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

  const updateField = (compIdx: number, fieldIdx: number, key: keyof ComponentField, value: string) => {
    setComponents((prev) => {
      const next = [...prev];
      next[compIdx] = { ...next[compIdx], fields: [...next[compIdx].fields] };
      next[compIdx].fields[fieldIdx] = { ...next[compIdx].fields[fieldIdx], [key]: value };
      return next;
    });
  };

  const removeField = (compIdx: number, fieldIdx: number) => {
    setComponents((prev) => {
      const next = [...prev];
      next[compIdx] = { ...next[compIdx], fields: next[compIdx].fields.filter((_, i) => i !== fieldIdx) };
      return next;
    });
  };

  const addField = (compIdx: number) => {
    setComponents((prev) => {
      const next = [...prev];
      next[compIdx] = { ...next[compIdx], fields: [...next[compIdx].fields, emptyField()] };
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

  /* ── Totals ────────────────────────────────────────────────── */

  const totalTemplates = components.length;
  const totalFields = components.reduce((s, c) => s + c.fields.length, 0);

  /* ── Reanalyze ─────────────────────────────────────────────── */

  const togglePreset = (preset: string) =>
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(preset)) next.delete(preset);
      else next.add(preset);
      return next;
    });

  const buildFeedback = (): string => {
    const parts: string[] = [...selectedPresets];
    if (feedbackText.trim()) parts.push(feedbackText.trim());
    return parts.join(". ");
  };

  const handleReanalyze = useCallback(async () => {
    const feedback = buildFeedback();
    if (!feedback) return;

    setReanalyzing(true);
    setReanalyzeError(null);

    try {
      let json: { success: boolean; analysis: Record<string, unknown>; error?: string; metadata?: AiCallMetadata };

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
            "x-tenant-id": selectedTenant?.tenantId ?? "unknown",
            ...(openAiApiKey ? { "x-openai-key": openAiApiKey } : {}),
            ...((data.analysisLlmModel as string) ? { "x-analysis-model": data.analysisLlmModel as string } : {}),
          },
        });
        json = await response.json();
        if (!response.ok) throw new Error(json.error || "Re-analysis failed");
      } else {
        const htmlContent = (data.htmlContent as string) ?? "";
        const response = await fetch("/api/analyze-html", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": selectedTenant?.tenantId ?? "unknown",
            ...(openAiApiKey ? { "x-openai-key": openAiApiKey } : {}),
            ...((data.analysisLlmModel as string) ? { "x-analysis-model": data.analysisLlmModel as string } : {}),
          },
          body: JSON.stringify({ html: htmlContent, feedback, previousResult: analysisRaw }),
        });
        json = await response.json();
        if (!response.ok) throw new Error(json.error || "Re-analysis failed");
      }

      if (json.metadata) recordStep(json.metadata);

      setStepData("analysisResult", json.analysis);
      setComponents(normalizeComponents(json.analysis));
      setSelectedPresets(new Set());
      setFeedbackText("");
    } catch (err: unknown) {
      setReanalyzeError(err instanceof Error ? err.message : "Re-analysis failed");
    } finally {
      setReanalyzing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, screenshotPreview, analysisRaw, data.htmlContent, openAiApiKey, selectedTenant, setStepData, selectedPresets, feedbackText, recordStep]);

  /* ── No data guard ─────────────────────────────────────────── */

  if (!analysisRaw) {
    return (
      <div className="space-y-6 pt-8">
        <div className="text-center py-12 text-muted-foreground">
          No analysis results yet. Go back and submit a component for analysis.
        </div>
        <Button variant="outline" onClick={goBack}>Back</Button>
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
              <CardTitle className="text-2xl font-bold">Components Overview</CardTitle>
              <CardDescription>
                {totalTemplates} template{totalTemplates !== 1 ? "s" : ""} detected ({totalFields} fields total) — review and edit before creating
              </CardDescription>
            </div>
            <Badge colorScheme="neutral">
              {sourceType === "screenshot" ? "From Screenshot" : "From HTML"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            {/* Source preview */}
            {screenshotPreview && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Source</h4>
                <img src={screenshotPreview} alt="Analyzed screenshot" className="w-full rounded-lg border" />
              </div>
            )}

            {/* Template Structure summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Template Structure</h4>
              {templateGroups.map((group) => (
                <div key={group.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {group.type === "list" ? (
                      <Badge colorScheme="primary" size="sm">List Component</Badge>
                    ) : (
                      <Badge colorScheme="neutral" size="sm">Standalone</Badge>
                    )}
                    <span className="font-semibold text-sm">{group.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5 ml-1">
                    {group.members.map((m) => {
                      const comp = components[m.idx];
                      return (
                        <div key={m.idx} className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${ROLE_DOT_COLORS[m.role] ?? "bg-gray-400"}`} />
                          <RoleLabel role={m.role} />
                          <span className="font-medium">{comp.componentName}</span>
                          <span className="text-muted-foreground">({comp.fields.length} field{comp.fields.length !== 1 ? "s" : ""})</span>
                        </div>
                      );
                    })}
                    {group.insertOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-1 mt-1 text-xs">
                        <span className="text-amber-600 dark:text-amber-400">⚡</span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Suggestions (page-level) */}
          {pageSuggestions && (
            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-semibold mb-1">AI Suggestions</h4>
              <p className="text-sm text-muted-foreground">{pageSuggestions}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Per-group template editors ═══ */}
      {templateGroups.map((group) => (
        <Card key={group.id}>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => toggleGroup(group.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{expandedGroups.has(group.id) ? "▼" : "▶"}</span>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {group.label}
                    {group.type === "list" ? (
                      <Badge colorScheme="primary" size="sm">List Component</Badge>
                    ) : (
                      <Badge colorScheme="neutral" size="sm">Standalone</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {group.members.length} template{group.members.length > 1 ? "s" : ""} — {group.members.map((m) => components[m.idx].componentName).join(", ")}
                  </CardDescription>
                </div>
              </div>
              <Badge colorScheme="neutral">
                {group.members.reduce((s, m) => s + components[m.idx].fields.length, 0)} fields
              </Badge>
            </div>

            {/* Content architecture banner */}
            {group.insertOptions.length > 0 && (
              <div className="mt-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                {group.insertOptions.map((opt, i) => (
                  <div key={i} className="text-xs flex items-center gap-1">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">⚡</span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}
          </CardHeader>

          {expandedGroups.has(group.id) && (
            <CardContent className="space-y-6 pt-0">
              {group.members.map((member, mIdx) => {
                const comp = components[member.idx];
                const compIdx = member.idx;

                return (
                  <div key={compIdx}>
                    {mIdx > 0 && <Separator className="mb-4" />}

                    {/* Template header row */}
                    <div className="flex items-center gap-3 mb-3">
                      <RoleBadge role={member.role} />
                      <Input
                        value={comp.componentName}
                        onChange={(e) => updateComponentName(compIdx, e.target.value)}
                        className="max-w-sm font-semibold h-9"
                      />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{comp.description}</span>
                      {comp.visualLocation && (
                        <span className="text-xs text-muted-foreground italic shrink-0">📍 {comp.visualLocation}</span>
                      )}
                    </div>

                    {/* Relationship info banners */}
                    {comp.isListComponent && comp.childTemplateName && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 text-xs mb-3">
                        <span className="font-medium">List parent</span> — child items use template: <code className="bg-muted px-1 rounded">{comp.childTemplateName}</code>
                      </div>
                    )}
                    {comp.isDatasourceFolder && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-xs mb-3">
                        <span className="font-medium">Datasource Folder</span> — no data fields, stores child items.
                        {comp.parentTemplateName && <> Belongs to: <code className="bg-muted px-1 rounded">{comp.parentTemplateName}</code></>}
                      </div>
                    )}
                    {!comp.isListComponent && !comp.isDatasourceFolder && comp.parentTemplateName && (
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-2 text-xs mb-3">
                        <span className="font-medium">Child item</span> — created inside folder for: <code className="bg-muted px-1 rounded">{comp.parentTemplateName}</code>
                      </div>
                    )}

                    {/* Fields table */}
                    {comp.fields.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold w-8">#</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold">Field Name</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold">Display Name</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold w-44">Type</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold">Source</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold">Description</th>
                              <th className="px-3 py-2 w-8" />
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {comp.fields.map((field, fIdx) => (
                              <tr key={fIdx} className="hover:bg-muted/30">
                                <td className="px-3 py-2 text-xs text-muted-foreground">{fIdx + 1}</td>
                                <td className="px-3 py-2">
                                  <Input value={field.name} onChange={(e) => updateField(compIdx, fIdx, "name", e.target.value)} className="h-8 text-sm font-mono" />
                                </td>
                                <td className="px-3 py-2">
                                  <Input value={field.displayName} onChange={(e) => updateField(compIdx, fIdx, "displayName", e.target.value)} className="h-8 text-sm" />
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={field.type}
                                    onChange={(e) => updateField(compIdx, fIdx, "type", e.target.value)}
                                    className="h-8 text-sm w-full rounded-md border bg-background px-2"
                                  >
                                    {SITECORE_FIELD_TYPES.map((ft) => (
                                      <option key={ft} value={ft}>{ft}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  {REFERENCE_FIELD_TYPES.has(field.type) ? (
                                    <Input
                                      value={field.source}
                                      onChange={(e) => updateField(compIdx, fIdx, "source", e.target.value)}
                                      placeholder="$site/Data/…"
                                      className="h-8 text-sm font-mono text-xs"
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <Input value={field.description} onChange={(e) => updateField(compIdx, fIdx, "description", e.target.value)} className="h-8 text-sm" />
                                </td>
                                <td className="px-3 py-2">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeField(compIdx, fIdx)}>×</Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic bg-muted/30 rounded-lg p-3">
                        No data fields — this is a structural folder template.
                      </div>
                    )}

                    {/* Add field */}
                    <div className="flex justify-end mt-2">
                      <Button size="sm" variant="outline" onClick={() => addField(compIdx)}>+ Add Field</Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      ))}

      <Separator />

      {/* ═══ Reanalyze section ═══ */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Not happy with the results?</CardTitle>
          <CardDescription>
            Select hints or describe what you&apos;d like changed, then re-analyze.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {REANALYZE_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={selectedPresets.has(preset) ? "default" : "outline"}
                size="sm"
                onClick={() => togglePreset(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="Describe what you'd like to change…"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-[80px]"
          />
          {reanalyzeError && <p className="text-sm text-destructive">{reanalyzeError}</p>}
          <Button
            onClick={handleReanalyze}
            disabled={reanalyzing || (selectedPresets.size === 0 && !feedbackText.trim())}
          >
            {reanalyzing ? "Re-analyzing…" : "Re-analyze"}
          </Button>
        </CardContent>
      </Card>

      {/* ═══ Debug: Raw JSON ═══ */}
      {process.env.NODE_ENV === "development" && (
        <Collapsible>
          <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
            ▶ Debug: Raw JSON
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="pt-4">
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono max-h-96">
                  {JSON.stringify({ groups: templateGroups, components }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ═══ Navigation ═══ */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>Back</Button>
        <Button onClick={() => { setStepData("editedComponents", components); setStepData("templateGroups", templateGroups); goNext(); }}>
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
}
