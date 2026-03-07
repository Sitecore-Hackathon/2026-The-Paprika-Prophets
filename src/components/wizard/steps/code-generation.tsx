"use client";

import { useState, useCallback, useMemo } from "react";
import { useWizard } from "../wizard-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/* ── Helpers ────────────────────────────────────────────────────── */

/** Convert PascalCase to kebab-case: "AnniversaryBanner" → "anniversary-banner" */
function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/* ── Code block parser ─────────────────────────────────────────── */

interface CodeBlock {
  filePath: string;
  language: string;
  code: string;
}

function parseCodeBlocks(raw: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const lang = match[1] ?? "tsx";
    const code = match[2].trim();
    const firstLine = code.split("\n")[0];
    const pathMatch = firstLine.match(/^\/\/\s*(.+\.\w+)/);
    blocks.push({
      filePath: pathMatch ? pathMatch[1].trim() : `component.${lang}`,
      language: lang,
      code: pathMatch ? code.split("\n").slice(1).join("\n").trim() : code,
    });
  }
  return blocks.length > 0
    ? blocks
    : [{ filePath: "output.tsx", language: "tsx", code: raw }];
}

/* ── Main Export ──────────────────────────────────────────────── */

export function CodeGeneration() {
  const { goBack, data } = useWizard();

  /* Read from wizard context */
  const openAiApiKey = (data.openAiApiKey as string) ?? "";
  const codingModel = (data.codingLlmModel as string) || "gpt-5.3-codex";
  const editedComponents = data.editedComponents as Record<string, unknown>[] | undefined;
  const templateGroups = data.templateGroups as Record<string, unknown>[] | undefined;

  /* Local state */
  const [separatePropsFile, setSeparatePropsFile] = useState(false);
  const [stylingSystem, setStylingSystem] = useState<"tailwind" | "bootstrap" | "css-modules" | "markup-only">("markup-only");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  /* Only include non-folder components for code gen (folders have no rendering) */
  const codegenComponents = useMemo(() => {
    if (!editedComponents) return [];
    return (editedComponents as { isDatasourceFolder?: boolean }[]).filter(
      (c) => !c.isDatasourceFolder,
    );
  }, [editedComponents]);

  /* ── Generate handler ─────────────────────────────────── */

  const handleGenerate = useCallback(async () => {
    if (!openAiApiKey) {
      setError("No OpenAI API key found. Please configure it in Settings (Step 2).");
      return;
    }
    if (codegenComponents.length === 0) {
      setError("No components available. Go back and complete the analysis step first.");
      return;
    }
    setGenerating(true);
    setError(null);
    setRawOutput(null);
    setCodeBlocks([]);

    try {
      const response = await fetch("/api/generate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-key": openAiApiKey,
          "x-coding-model": codingModel,
        },
        body: JSON.stringify({
          components: codegenComponents,
          groups: templateGroups,
          options: { separatePropsFile, stylingSystem },
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Generation failed");

      setRawOutput(json.code);
      setCodeBlocks(parseCodeBlocks(json.code));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [openAiApiKey, codingModel, codegenComponents, templateGroups, separatePropsFile, stylingSystem]);

  /* ── Clipboard ────────────────────────────────────────── */

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyCmd = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  /* ── Single combined terminal command ────────────────── */

  const terminalCommand = useMemo(() => {
    if (codeBlocks.length === 0) return "";
    const parts: string[] = [];

    for (const block of codeBlocks) {
      const dir = block.filePath.replace(/\/[^/]+$/, "");
      parts.push(`New-Item -ItemType Directory -Force -Path "${dir}"\n@'\n${block.code}\n'@ | Set-Content -Path "${block.filePath}" -Encoding UTF8`);
    }

    parts.push("sitecore-tools project component generate-map");

    return parts.join("\n\n");
  }, [codeBlocks]);

  /* ── No data guard ─────────────────────────────────────── */

  if (!editedComponents || editedComponents.length === 0) {
    return (
      <div className="space-y-6 pt-8">
        <div className="text-center py-12 text-muted-foreground">
          No component data available. Go back and complete the analysis step first.
        </div>
        <Button variant="outline" onClick={goBack}>Back</Button>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Code Generation</h1>
        <p className="text-muted-foreground mt-1">
          Generate Content SDK compatible Next.js component code from the analyzed templates.
        </p>
      </div>

      {/* Summary of what will be generated */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Components to Generate</CardTitle>
          <CardDescription>
            {codegenComponents.length} component{codegenComponents.length !== 1 ? "s" : ""} (excluding data folders) — using <code className="bg-muted px-1 rounded text-xs">{codingModel}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Component</th>
                  <th className="px-3 py-2 text-left font-semibold">Folder</th>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-left font-semibold">Fields</th>
                  <th className="px-3 py-2 text-left font-semibold">Variants</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {codegenComponents.map((comp: Record<string, unknown>) => (
                  <tr key={String(comp.componentName)} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono font-medium">{String(comp.componentName)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      src/components/{toKebab(String(comp.componentName))}/
                    </td>
                    <td className="px-3 py-2">
                      <Badge colorScheme={comp.isListComponent ? "primary" : "neutral"} size="sm">
                        {comp.isListComponent ? "List Parent" : comp.parentTemplateName ? "Child" : "Standalone"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{(comp.fields as unknown[])?.length ?? 0}</td>
                    <td className="px-3 py-2 text-xs">
                      {((comp.variants as { name: string }[]) ?? []).map((v) => v.name).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Code generation options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Code Generation Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Props / Types Location</label>
              <select
                value={separatePropsFile ? "separate" : "inline"}
                onChange={(e) => setSeparatePropsFile(e.target.value === "separate")}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="inline">Inline in component file</option>
                <option value="separate">Separate .props.ts file</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {separatePropsFile
                  ? "Fields interface & Props type in a separate file, imported by the component."
                  : "Fields interface & Props type defined at the top of the component file."}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Styling System</label>
              <select
                value={stylingSystem}
                onChange={(e) => setStylingSystem(e.target.value as typeof stylingSystem)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="markup-only">Markup only (BEM classes, no framework)</option>
                <option value="tailwind">Tailwind CSS</option>
                <option value="bootstrap">Bootstrap</option>
                <option value="css-modules">CSS Modules</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {stylingSystem === "markup-only" && "Semantic HTML with meaningful BEM-style class names."}
                {stylingSystem === "tailwind" && "Tailwind utility classes applied directly in JSX."}
                {stylingSystem === "bootstrap" && "Bootstrap grid and component classes."}
                {stylingSystem === "css-modules" && "Scoped styles via .module.css files (generated as a separate block)."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate button */}
      <div className="flex items-center gap-4">
        <Button size="lg" onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating…" : "Generate Component Code"}
        </Button>
        {generating && (
          <span className="text-sm text-muted-foreground animate-pulse">
            Calling {codingModel}…
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Generated code blocks */}
      {codeBlocks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Generated Code</h2>
          {codeBlocks.map((block, idx) => (
            <Card key={idx}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{block.filePath}</span>
                  <div className="flex items-center gap-2">
                    <Badge colorScheme="neutral" size="sm">{block.language}</Badge>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(block.code, idx)}>
                      {copiedIdx === idx ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono max-h-[600px] leading-relaxed">
                  {block.code}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Terminal command (single combined block) */}
      {terminalCommand && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Terminal Commands</CardTitle>
                <Badge colorScheme="neutral" size="sm">PowerShell</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyCmd(terminalCommand, "all")}>
                {copiedCmd === "all" ? "Copied!" : "Copy All"}
              </Button>
            </div>
            <CardDescription>
              Copy &amp; paste into your terminal to write all component files and regenerate the component map.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-zinc-900 text-green-400 p-3 rounded-lg overflow-auto text-xs font-mono max-h-[500px]">
              {terminalCommand}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Raw output debug */}
      {process.env.NODE_ENV === "development" && rawOutput && (
        <Collapsible>
          <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
            ▶ Debug: Raw LLM Output
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="pt-4">
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono max-h-96">
                  {rawOutput}
                </pre>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>Back</Button>
      </div>
    </div>
  );
}
