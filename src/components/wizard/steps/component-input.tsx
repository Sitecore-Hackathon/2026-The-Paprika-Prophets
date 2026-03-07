"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnalysisLoader } from "../analysis-loader";

export function ComponentInput() {
  const { goNext, goBack, data, setStepData } = useWizard();
  const { selectedTenant } = useTenantContext();

  const [selectedOption, setSelectedOption] = useState<
    "screenshot" | "html" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Screenshot state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // HTML state
  const [htmlContent, setHtmlContent] = useState("");

  const openAiApiKey = (data.openAiApiKey as string) ?? "";

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Global paste handler for screenshots
  useEffect(() => {
    if (selectedOption !== "screenshot") return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            setImageFile(blob);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [selectedOption]);

  const handleScreenshotAnalysis = useCallback(async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const response = await fetch("/api/analyze-screenshot", {
        method: "POST",
        body: formData,
        headers: {
          "x-tenant-id": selectedTenant?.tenantId ?? "unknown",
          ...(openAiApiKey ? { "x-openai-key": openAiApiKey } : {}),
        },
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Analysis failed");

      setStepData("analysisResult", json.analysis);
      setStepData("analysisRaw", json.raw);
      setStepData("sourceType", "screenshot");
      if (imagePreview) setStepData("screenshotPreview", imagePreview);
      goNext();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [
    imageFile,
    imagePreview,
    openAiApiKey,
    selectedTenant,
    setStepData,
    goNext,
  ]);

  const handleHtmlAnalysis = useCallback(async () => {
    if (!htmlContent.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": selectedTenant?.tenantId ?? "unknown",
          ...(openAiApiKey ? { "x-openai-key": openAiApiKey } : {}),
        },
        body: JSON.stringify({ html: htmlContent }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Analysis failed");

      setStepData("analysisResult", json.analysis);
      setStepData("analysisRaw", json.raw);
      setStepData("sourceType", "html");
      setStepData("htmlContent", htmlContent);
      goNext();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [htmlContent, openAiApiKey, selectedTenant, setStepData, goNext]);

  return (
    <div className="space-y-6 pt-8">
      {loading && (
        <AnalysisLoader
          label={
            selectedOption === "screenshot"
              ? "Analyzing screenshot"
              : "Analyzing HTML"
          }
        />
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Analyze Component
        </h1>
        <p className="text-muted-foreground mt-1">
          Provide a screenshot or HTML and let AI identify Sitecore components.
        </p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Choose Input Method</CardTitle>
          <CardDescription>
            Upload a screenshot or paste HTML to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Option tabs */}
          <div className="flex gap-4 justify-center">
            <Button
              variant={selectedOption === "screenshot" ? "default" : "outline"}
              onClick={() => setSelectedOption("screenshot")}
              size="lg"
            >
              Upload Screenshot
            </Button>
            <Button
              variant={selectedOption === "html" ? "default" : "outline"}
              onClick={() => setSelectedOption("html")}
              size="lg"
            >
              Paste HTML
            </Button>
          </div>

          {error && (
            <Alert variant="danger">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Screenshot */}
          {selectedOption === "screenshot" && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer"
                tabIndex={0}
                onClick={() => !imagePreview && fileInputRef.current?.click()}
              >
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-96 mx-auto rounded-lg"
                    />
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Upload or paste a screenshot of your component
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click to select a file or press Ctrl+V to paste from
                      clipboard
                    </p>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Select Image
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={handleScreenshotAnalysis}
                disabled={!imageFile || loading}
                className="w-full"
              >
                {loading ? "Analyzing..." : "Analyze Screenshot"}
              </Button>
            </div>
          )}

          {/* HTML */}
          {selectedOption === "html" && (
            <div className="space-y-4">
              <Textarea
                placeholder="<div>Your HTML here...</div>"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              <Button
                onClick={handleHtmlAnalysis}
                disabled={!htmlContent.trim() || loading}
                className="w-full"
              >
                {loading ? "Analyzing..." : "Analyze HTML"}
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!selectedOption && (
            <div className="text-center py-8 text-muted-foreground">
              Select an option above to get started
            </div>
          )}
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
