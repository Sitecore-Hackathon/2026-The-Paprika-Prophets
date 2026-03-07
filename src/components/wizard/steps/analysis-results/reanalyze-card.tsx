"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const REANALYZE_PRESETS = [
  "Treat as a single component",
  "Split into more components",
  "More detailed fields",
  "Simplify — fewer fields",
  "Focus on list / repeater patterns",
] as const;

type ReanalyzeCardProps = {
  selectedPresets: Set<string>;
  onTogglePreset: (preset: string) => void;
  feedbackText: string;
  onFeedbackChange: (text: string) => void;
  error: string | null;
  loading: boolean;
  onReanalyze: () => void;
};

export const ReanalyzeCard = ({
  selectedPresets,
  onTogglePreset,
  feedbackText,
  onFeedbackChange,
  error,
  loading,
  onReanalyze,
}: ReanalyzeCardProps) => (
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
            onClick={() => onTogglePreset(preset)}
          >
            {preset}
          </Button>
        ))}
      </div>
      <Textarea
        placeholder="Describe what you'd like to change…"
        value={feedbackText}
        onChange={(e) => onFeedbackChange(e.target.value)}
        className="min-h-[80px]"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        onClick={onReanalyze}
        disabled={
          loading || (selectedPresets.size === 0 && !feedbackText.trim())
        }
      >
        {loading ? "Re-analyzing…" : "Re-analyze"}
      </Button>
    </CardContent>
  </Card>
);
