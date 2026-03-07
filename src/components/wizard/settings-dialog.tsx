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
import { Badge } from "@/components/ui/badge";
import { AuthoringService } from "@/lib/services/authoring-service";
import { SITECORE_PATHS } from "@/lib/installation/constants";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authoringService: AuthoringService;
  onSaved?: (fields: { openAiApiKey: string; llmModel: string }) => void;
}

const SETTINGS_PATH =
  SITECORE_PATHS.SYSTEM.MODULES + "/Component Forge/Settings";

export function SettingsDialog({
  open,
  onOpenChange,
  authoringService,
  onSaved,
}: SettingsDialogProps) {
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("gpt-4");
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
        const modelField = fields.find((f) => f.name === "LLM Model");
        if (apiKeyField) setOpenAiApiKey(apiKeyField.value);
        if (modelField) setLlmModel(modelField.value || "gpt-4");
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
        { name: "LLM Model", value: llmModel },
      ]);
      onSaved?.({ openAiApiKey, llmModel });
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
              <Label htmlFor="llm-model">LLM Model</Label>
              <Input
                id="llm-model"
                type="text"
                placeholder="gpt-4"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The OpenAI model to use (e.g. gpt-4, gpt-4o, gpt-3.5-turbo).
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
