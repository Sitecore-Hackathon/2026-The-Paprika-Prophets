"use client";

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
import { Separator } from "@/components/ui/separator";
import type {
  ComponentField,
  AnalyzedComponent,
  TemplateGroup,
} from "@/lib/types/component";
import { REFERENCE_FIELD_TYPES } from "@/lib/types/component";
import { RoleBadge } from "./role-badges";

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

type TemplateEditorCardProps = {
  group: TemplateGroup;
  components: AnalyzedComponent[];
  expanded: boolean;
  onToggle: () => void;
  onUpdateField: (
    compIdx: number,
    fieldIdx: number,
    key: keyof ComponentField,
    value: string,
  ) => void;
  onRemoveField: (compIdx: number, fieldIdx: number) => void;
  onAddField: (compIdx: number) => void;
  onUpdateComponentName: (compIdx: number, name: string) => void;
};

export const TemplateEditorCard = ({
  group,
  components,
  expanded,
  onToggle,
  onUpdateField,
  onRemoveField,
  onAddField,
  onUpdateComponentName,
}: TemplateEditorCardProps) => (
  <Card>
    <CardHeader className="cursor-pointer select-none" onClick={onToggle}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{expanded ? "▼" : "▶"}</span>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {group.label}
              {group.type === "list" ? (
                <Badge colorScheme="primary" size="sm">
                  List Component
                </Badge>
              ) : (
                <Badge colorScheme="neutral" size="sm">
                  Standalone
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {group.members.length} template
              {group.members.length > 1 ? "s" : ""} —{" "}
              {group.members
                .map((m) => components[m.idx].componentName)
                .join(", ")}
            </CardDescription>
          </div>
        </div>
        <Badge colorScheme="neutral">
          {group.members.reduce(
            (s, m) => s + components[m.idx].fields.length,
            0,
          )}{" "}
          fields
        </Badge>
      </div>

      {group.insertOptions.length > 0 && (
        <div className="mt-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
          {group.insertOptions.map((opt, i) => (
            <div key={i} className="text-xs flex items-center gap-1">
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                ⚡
              </span>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </CardHeader>

    {expanded && (
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
                  onChange={(e) =>
                    onUpdateComponentName(compIdx, e.target.value)
                  }
                  className="max-w-sm font-semibold h-9"
                />
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {comp.description}
                </span>
                {comp.visualLocation && (
                  <span className="text-xs text-muted-foreground italic shrink-0">
                    📍 {comp.visualLocation}
                  </span>
                )}
              </div>

              {/* Relationship info banners */}
              {comp.isListComponent && comp.childTemplateName && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 text-xs mb-3">
                  <span className="font-medium">List parent</span> — child
                  items use template:{" "}
                  <code className="bg-muted px-1 rounded">
                    {comp.childTemplateName}
                  </code>
                </div>
              )}
              {comp.isDatasourceFolder && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-xs mb-3">
                  <span className="font-medium">Datasource Folder</span> — no
                  data fields, stores child items.
                  {comp.parentTemplateName && (
                    <>
                      {" "}
                      Belongs to:{" "}
                      <code className="bg-muted px-1 rounded">
                        {comp.parentTemplateName}
                      </code>
                    </>
                  )}
                </div>
              )}
              {!comp.isListComponent &&
                !comp.isDatasourceFolder &&
                comp.parentTemplateName && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-2 text-xs mb-3">
                    <span className="font-medium">Child item</span> — created
                    inside folder for:{" "}
                    <code className="bg-muted px-1 rounded">
                      {comp.parentTemplateName}
                    </code>
                  </div>
                )}

              {/* Fields table */}
              {comp.fields.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold w-8">
                          #
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">
                          Field Name
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">
                          Display Name
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold w-44">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">
                          Source
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">
                          Description
                        </th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {comp.fields.map((field, fIdx) => (
                        <tr key={fIdx} className="hover:bg-muted/30">
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {fIdx + 1}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={field.name}
                              onChange={(e) =>
                                onUpdateField(
                                  compIdx,
                                  fIdx,
                                  "name",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-sm font-mono"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={field.displayName}
                              onChange={(e) =>
                                onUpdateField(
                                  compIdx,
                                  fIdx,
                                  "displayName",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={field.type}
                              onChange={(e) =>
                                onUpdateField(
                                  compIdx,
                                  fIdx,
                                  "type",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-sm w-full rounded-md border bg-background px-2"
                            >
                              {SITECORE_FIELD_TYPES.map((ft) => (
                                <option key={ft} value={ft}>
                                  {ft}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            {REFERENCE_FIELD_TYPES.has(field.type) ? (
                              <Input
                                value={field.source}
                                onChange={(e) =>
                                  onUpdateField(
                                    compIdx,
                                    fIdx,
                                    "source",
                                    e.target.value,
                                  )
                                }
                                placeholder="$site/Data/…"
                                className="h-8 text-sm font-mono text-xs"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={field.description}
                              onChange={(e) =>
                                onUpdateField(
                                  compIdx,
                                  fIdx,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => onRemoveField(compIdx, fIdx)}
                            >
                              ×
                            </Button>
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddField(compIdx)}
                >
                  + Add Field
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    )}
  </Card>
);
