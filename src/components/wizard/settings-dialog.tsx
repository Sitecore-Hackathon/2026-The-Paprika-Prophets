"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AuthoringService } from "@/lib/services/authoring-service";
import { SITECORE_PATHS } from "@/lib/installation/constants";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authoringService: AuthoringService;
  onSaved?: (fields: {
    openAiApiKey: string;
    analysisLlmModel: string;
    codingLlmModel: string;
  }) => void;
}

const SETTINGS_PATH =
  SITECORE_PATHS.SYSTEM.MODULES + "/Component Forge/Settings";

/* ── Model catalogue ───────────────────────────────────────────── */

type ModelEntry = { value: string; label: string };
type ModelGroup = { label: string; models: ModelEntry[] };

const GPT5_MODELS: ModelEntry[] = [
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.4-pro", label: "GPT-5.4 Pro" },
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5.2-pro", label: "GPT-5.2 Pro" },
  { value: "gpt-5.1", label: "GPT-5.1" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gpt-5-pro", label: "GPT-5 Pro" },
  { value: "gpt-5-mini", label: "GPT-5 Mini" },
  { value: "gpt-5-nano", label: "GPT-5 Nano" },
];

const CODEX_MODELS: ModelEntry[] = [
  { value: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
  { value: "gpt-5.2-codex", label: "GPT-5.2 Codex" },
  { value: "gpt-5.1-codex", label: "GPT-5.1 Codex" },
  { value: "gpt-5.1-codex-mini", label: "GPT-5.1 Codex Mini" },
  { value: "gpt-5-codex", label: "GPT-5 Codex" },
];

const ANALYSIS_MODEL_GROUPS: ModelGroup[] = [
  { label: "GPT-5 Series", models: GPT5_MODELS },
];

const CODING_MODEL_GROUPS: ModelGroup[] = [
  { label: "Codex (Optimised for Code)", models: CODEX_MODELS },
  { label: "GPT-5 Series", models: GPT5_MODELS },
];

function ModelSelectContent({ groups }: { groups: ModelGroup[] }) {
  return (
    <>
      {groups.map((group, gi) => (
        <Fragment key={group.label}>
          {gi > 0 && <SelectSeparator />}
          <SelectGroup>
            <SelectLabel>{group.label}</SelectLabel>
            {group.models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </Fragment>
      ))}
    </>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  authoringService,
  onSaved,
}: SettingsDialogProps) {
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [analysisLlmModel, setAnalysisLlmModel] = useState("gpt-5-mini");
  const [codingLlmModel, setCodingLlmModel] = useState("gpt-5.3-codex");
  const [settingsItemId, setSettingsItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const item = await authoringService.getItemWithFields(SETTINGS_PATH);
      if (item) {
        setSettingsItemId(item.itemId);
        const fields = item.fields?.nodes ?? [];
        const apiKeyField = fields.find((f) => f.name === "OpenAI API Key");
        const analysisModelField = fields.find(
          (f) => f.name === "Analysis LLM Model",
        );
        const codingModelField = fields.find(
          (f) => f.name === "Coding LLM Model",
        );
        if (apiKeyField) setOpenAiApiKey(apiKeyField.value);
        if (analysisModelField)
          setAnalysisLlmModel(analysisModelField.value || "gpt-5-mini");
        if (codingModelField)
          setCodingLlmModel(codingModelField.value || "gpt-5.3-codex");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [authoringService]);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, loadSettings]);

  const handleSave = async () => {
    if (!settingsItemId) return;
    setSaving(true);
    setError(null);
    try {
      await authoringService.updateItemFields(settingsItemId, "en", [
        { name: "OpenAI API Key", value: openAiApiKey },
        { name: "Analysis LLM Model", value: analysisLlmModel },
        { name: "Coding LLM Model", value: codingLlmModel },
      ]);
      onSaved?.({ openAiApiKey, analysisLlmModel, codingLlmModel });
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Component Forge Settings</DialogTitle>
          <DialogDescription>
            Configure your OpenAI credentials and model preferences. These are
            stored securely in your Sitecore instance.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">
            Loading settings...
          </p>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="openai-api-key">
                OpenAI API Key
                <Badge colorScheme="danger" size="sm" className="ml-2">
                  required
                </Badge>
              </Label>
              <Input
                id="openai-api-key"
                type="password"
                placeholder="sk-..."
                value={openAiApiKey}
                onChange={(e) => setOpenAiApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your OpenAI API key for AI-powered component generation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-llm-model">Analysis LLM Model</Label>
              <Select
                value={analysisLlmModel}
                onValueChange={setAnalysisLlmModel}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <ModelSelectContent groups={ANALYSIS_MODEL_GROUPS} />
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The model used for screenshot and HTML analysis.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coding-llm-model">Coding LLM Model</Label>
              <Select
                value={codingLlmModel}
                onValueChange={setCodingLlmModel}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <ModelSelectContent groups={CODING_MODEL_GROUPS} />
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The model used for component code generation.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            colorScheme="neutral"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !openAiApiKey.trim()}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
