"use client";

import { useCallback, useEffect, useState } from "react";
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

function AnalysisModelSelectContent() {
  return (
    <>
      <SelectGroup>
        <SelectLabel>GPT-5 Series</SelectLabel>
        <SelectItem value="gpt-5.4">GPT-5.4</SelectItem>
        <SelectItem value="gpt-5.4-pro">GPT-5.4 Pro</SelectItem>
        <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
        <SelectItem value="gpt-5.2-pro">GPT-5.2 Pro</SelectItem>
        <SelectItem value="gpt-5.1">GPT-5.1</SelectItem>
        <SelectItem value="gpt-5">GPT-5</SelectItem>
        <SelectItem value="gpt-5-pro">GPT-5 Pro</SelectItem>
        <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
        <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Reasoning</SelectLabel>
        <SelectItem value="o3-pro">o3-pro</SelectItem>
        <SelectItem value="o3">o3</SelectItem>
        <SelectItem value="o4-mini">o4-mini</SelectItem>
        <SelectItem value="o3-mini">o3-mini</SelectItem>
        <SelectItem value="o1">o1</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>GPT-4 Series</SelectLabel>
        <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
        <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
        <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
        <SelectItem value="gpt-4">GPT-4</SelectItem>
      </SelectGroup>
    </>
  );
}

function CodingModelSelectContent() {
  return (
    <>
      <SelectGroup>
        <SelectLabel>Codex (Optimised for Code)</SelectLabel>
        <SelectItem value="gpt-5.3-codex">GPT-5.3 Codex</SelectItem>
        <SelectItem value="gpt-5.2-codex">GPT-5.2 Codex</SelectItem>
        <SelectItem value="gpt-5.1-codex">GPT-5.1 Codex</SelectItem>
        <SelectItem value="gpt-5.1-codex-mini">GPT-5.1 Codex Mini</SelectItem>
        <SelectItem value="gpt-5-codex">GPT-5 Codex</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>GPT-5 Series</SelectLabel>
        <SelectItem value="gpt-5.4">GPT-5.4</SelectItem>
        <SelectItem value="gpt-5.4-pro">GPT-5.4 Pro</SelectItem>
        <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
        <SelectItem value="gpt-5.2-pro">GPT-5.2 Pro</SelectItem>
        <SelectItem value="gpt-5.1">GPT-5.1</SelectItem>
        <SelectItem value="gpt-5">GPT-5</SelectItem>
        <SelectItem value="gpt-5-pro">GPT-5 Pro</SelectItem>
        <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
        <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Reasoning</SelectLabel>
        <SelectItem value="o3-pro">o3-pro</SelectItem>
        <SelectItem value="o3">o3</SelectItem>
        <SelectItem value="o4-mini">o4-mini</SelectItem>
        <SelectItem value="o3-mini">o3-mini</SelectItem>
        <SelectItem value="o1">o1</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>GPT-4 Series</SelectLabel>
        <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
        <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
        <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
        <SelectItem value="gpt-4">GPT-4</SelectItem>
      </SelectGroup>
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
  const [analysisLlmModel, setAnalysisLlmModel] = useState("gpt-4o");
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
          setAnalysisLlmModel(analysisModelField.value || "gpt-4o");
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
                  <AnalysisModelSelectContent />
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
                  <CodingModelSelectContent />
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
