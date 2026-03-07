"use client";

import { useState, useCallback, useMemo } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/* ── Hardcoded sample input ────────────────────────────────────── */

const SAMPLE_INPUT = {
  groups: [
    {
      id: "AnniversaryBanner",
      label: "AnniversaryBanner",
      type: "standalone",
      members: [{ role: "standalone", idx: 0 }],
      insertOptions: [],
    },
  ],
  components: [
    {
      componentName: "AnniversaryBanner",
      description:
        "A promotional banner celebrating a milestone with text and optional image.",
      visualLocation: "Center of the page.",
      isListComponent: false,
      childTemplateName: null,
      isDatasourceFolder: false,
      parentTemplateName: null,
      fields: [
        {
          name: "Title",
          displayName: "Title",
          type: "Single-Line Text",
          description: "Main headline for the banner.",
          required: true,
          source: "",
        },
        {
          name: "Description",
          displayName: "Description",
          type: "Multi-Line Text",
          description: "Supporting text for the banner.",
          required: true,
          source: "",
        },
        {
          name: "BannerImage",
          displayName: "Banner Image",
          type: "Image",
          description: "The image displayed on the banner.",
          required: false,
          source: "",
        },
      ],
      variants: [
        { name: "Default", description: "Standard appearance with image." },
        { name: "TextOnly", description: "Appearance without image." },
      ],
      sxaStyles: [
        {
          name: "Alignment",
          options: ["Left", "Center"],
          description: "Text alignment options for the banner.",
        },
        {
          name: "ImagePosition",
          options: ["Left", "Right"],
          description: "Option to mirror the image position.",
        },
      ],
      suggestions:
        "Ensure the image is high resolution and complements the text for clarity.",
    },
  ],
};

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
    // Extract file path from first comment line
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

/* ── Page component ────────────────────────────────────────────── */

export default function CodeGenPage() {
  const [apiKey, setApiKey] = useState("");
  const [codingModel, setCodingModel] = useState("gpt-4.1");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("Please enter your OpenAI API key.");
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
          "x-openai-key": apiKey.trim(),
          "x-coding-model": codingModel,
        },
        body: JSON.stringify(SAMPLE_INPUT),
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
  }, [apiKey, codingModel]);

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

  /** Build terminal commands: scaffold + file write for each generated block */
  const terminalSteps = useMemo(() => {
    if (codeBlocks.length === 0) return [];
    const componentNames = SAMPLE_INPUT.components.map((c) => c.componentName);
    const steps: { label: string; command: string; key: string }[] = [];

    // Step 1: scaffold commands
    for (const name of componentNames) {
      steps.push({
        label: `Scaffold ${name}`,
        command: `sitecore-tools project component scaffold ${name}`,
        key: `scaffold-${name}`,
      });
    }

    // Step 2: file content write commands (PowerShell single-quoted here-string — fully literal, no escaping needed)
    for (const block of codeBlocks) {
      steps.push({
        label: `Write ${block.filePath}`,
        command: `@'\n${block.code}\n'@ | Set-Content -Path "${block.filePath}" -Encoding UTF8`,
        key: `write-${block.filePath}`,
      });
    }

    // Bonus: combined "run all" script
    const allCmds = steps.map((s) => s.command).join("\n\n");
    steps.push({
      label: "All commands (combined)",
      command: allCmds,
      key: "all-combined",
    });

    return steps;
  }, [codeBlocks]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Code Generation POC</h1>
        <p className="text-muted-foreground mt-1">
          Generate Content SDK compatible Next.js component code from template
          definitions.
        </p>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
          <CardDescription>
            Configure API key and coding model before generating.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">OpenAI API Key</label>
              <Input
                type="password"
                placeholder="sk-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Coding Model</label>
              <select
                value={codingModel}
                onChange={(e) => setCodingModel(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <optgroup label="GPT-5 Series">
                  <option value="gpt-5.3-codex">gpt-5.3-codex</option>
                  <option value="gpt-5.3-turbo">gpt-5.3-turbo</option>
                  <option value="gpt-5-turbo">gpt-5-turbo</option>
                </optgroup>
                <optgroup label="Reasoning">
                  <option value="o3">o3</option>
                  <option value="o3-pro">o3-pro</option>
                  <option value="o4-mini">o4-mini</option>
                </optgroup>
                <optgroup label="GPT-4 Series">
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                </optgroup>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input JSON */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Input — Template Definitions</CardTitle>
              <CardDescription>
                Hardcoded sample: {SAMPLE_INPUT.components.length} component
                {SAMPLE_INPUT.components.length !== 1 ? "s" : ""},{" "}
                {SAMPLE_INPUT.components.reduce(
                  (s, c) => s + c.fields.length,
                  0,
                )}{" "}
                fields
              </CardDescription>
            </div>
            <Badge colorScheme="neutral">
              {SAMPLE_INPUT.groups[0]?.type ?? "standalone"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Collapsible>
            <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              ▶ Show JSON
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono max-h-80 mt-2">
                {JSON.stringify(SAMPLE_INPUT, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>

          {/* Quick summary table */}
          <div className="mt-4 border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Component</th>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-left font-semibold">Fields</th>
                  <th className="px-3 py-2 text-left font-semibold">Variants</th>
                  <th className="px-3 py-2 text-left font-semibold">SXA Styles</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {SAMPLE_INPUT.components.map((comp) => (
                  <tr key={comp.componentName} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono font-medium">
                      {comp.componentName}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        colorScheme={
                          comp.isListComponent ? "primary" : "neutral"
                        }
                        size="sm"
                      >
                        {comp.isListComponent ? "List" : "Standalone"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{comp.fields.length}</td>
                    <td className="px-3 py-2">
                      {comp.variants.map((v) => v.name).join(", ")}
                    </td>
                    <td className="px-3 py-2">
                      {comp.sxaStyles.map((s) => s.name).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Generate button */}
      <div className="flex items-center gap-4">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating}
        >
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

      {/* Generated code */}
      {codeBlocks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Generated Code</h2>
          {codeBlocks.map((block, idx) => (
            <Card key={idx}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">
                    {block.filePath}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge colorScheme="neutral" size="sm">
                      {block.language}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(block.code, idx)}
                    >
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

      {/* Terminal commands */}
      {terminalSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Terminal Commands
              <Badge colorScheme="neutral" size="sm">PowerShell</Badge>
            </CardTitle>
            <CardDescription>
              Copy &amp; paste these commands into your terminal to scaffold and write the component files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {terminalSteps.map((step, stepIdx) => (
              <div key={step.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    <span className="text-muted-foreground mr-1">Step {stepIdx + 1}.</span>
                    {step.label}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCmd(step.command, step.key)}
                  >
                    {copiedCmd === step.key ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <pre className="bg-zinc-900 text-green-400 p-3 rounded-lg overflow-auto text-xs font-mono max-h-48">
                  {step.command}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Raw output */}
      {rawOutput && (
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
    </div>
  );
}
