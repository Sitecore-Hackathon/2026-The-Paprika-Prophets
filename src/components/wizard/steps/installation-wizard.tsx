"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWizard } from "../wizard-context";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace-provider";
import { useTenantContext } from "@/components/providers/tenant-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SITECORE_PATHS } from "@/lib/installation/constants";
import {
  InstallationService,
  type InstallationStatus,
  type InstallationProgress,
  type InstallationStep,
} from "@/lib/services/installation-service";
import { SettingsDialog } from "../settings-dialog";
import { cn } from "@/lib/utils/tailwind";

function StepIndicator({ step }: { step: InstallationStep }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Badge
        colorScheme={
          step.status === "completed"
            ? "success"
            : step.status === "failed"
              ? "danger"
              : step.status === "in-progress"
                ? "primary"
                : "neutral"
        }
        size="sm"
      >
        {step.status}
      </Badge>
      <span className="text-sm">{step.name}</span>
      {step.error && (
        <span className="text-xs text-danger-500">{step.error}</span>
      )}
    </div>
  );
}

export const InstallationWizard = () => {
  const { goNext, goBack, setStepData } = useWizard();
  const client = useMarketplaceClient();
  const appContext = useAppContext();
  const { selectedTenant } = useTenantContext();

  const [status, setStatus] = useState<InstallationStatus | null>(null);
  const [progress, setProgress] = useState<InstallationProgress | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openAiKeySet, setOpenAiKeySet] = useState(false);
  const [checkingSettings, setCheckingSettings] = useState(false);

  const sitecoreContextId = selectedTenant?.context?.preview ?? "";

  const service = useMemo(
    () => new InstallationService(client, sitecoreContextId),
    [client, sitecoreContextId],
  );

  const checkInstallation = useCallback(async () => {
    if (!sitecoreContextId) return;
    const result = await service.checkInstallation();
    setStatus(result);
  }, [service, sitecoreContextId]);

  const checkSettings = useCallback(async () => {
    if (!sitecoreContextId) return;
    setCheckingSettings(true);
    try {
      const authoring = service.getAuthoringService();
      const settingsPath = SITECORE_PATHS.MODULE.SETTINGS;
      const item = await authoring.getItemWithFields(settingsPath);
      if (item) {
        const fields = item.fields?.nodes ?? [];
        const apiKeyField = fields.find((f) => f.name === "OpenAI API Key");
        const hasKey = !!apiKeyField?.value?.trim();
        setOpenAiKeySet(hasKey);
        if (hasKey) {
          setStepData("openAiApiKey", apiKeyField!.value);
          const analysisModelField = fields.find(
            (f) => f.name === "Analysis LLM Model",
          );
          const codingModelField = fields.find(
            (f) => f.name === "Coding LLM Model",
          );
          if (analysisModelField?.value) {
            setStepData("analysisLlmModel", analysisModelField.value);
          }
          if (codingModelField?.value) {
            setStepData("codingLlmModel", codingModelField.value);
          }
        }
      }
    } catch {
      // settings not available yet
    } finally {
      setCheckingSettings(false);
    }
  }, [service, sitecoreContextId, setStepData]);

  useEffect(() => {
    checkInstallation();
  }, [checkInstallation]);

  // Check settings once installation is complete
  useEffect(() => {
    if (status?.state === "installed") {
      checkSettings();
    }
  }, [status?.state, checkSettings]);

  const handleInstall = async () => {
    if (!sitecoreContextId) return;
    setIsInstalling(true);

    try {
      await service.install((p) => setProgress({ ...p }));
      await checkInstallation();
    } catch {
      // progress state already captures errors
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSettingsSaved = (fields: {
    openAiApiKey: string;
    analysisLlmModel: string;
    codingLlmModel: string;
  }) => {
    setOpenAiKeySet(!!fields.openAiApiKey.trim());
    setStepData("openAiApiKey", fields.openAiApiKey);
    setStepData("analysisLlmModel", fields.analysisLlmModel);
    setStepData("codingLlmModel", fields.codingLlmModel);
  };

  const isInstalled = status?.state === "installed";
  const isReady = isInstalled && openAiKeySet;

  /* Expose the service to downstream wizard steps (code-generation needs it for run-log save). */
  useEffect(() => {
    if (isInstalled) {
      setStepData("installationService", service);
    }
  }, [isInstalled, service, setStepData]);

  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Installation</h1>
        <p className="text-muted-foreground mt-1">
          Component Forge needs templates and items installed in your Sitecore
          instance before you can create components.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Installation Status
            {status && (
              <Badge
                colorScheme={
                  status.state === "installed"
                    ? "success"
                    : status.state === "error"
                      ? "danger"
                      : status.state === "checking"
                        ? "neutral"
                        : "warning"
                }
              >
                {status.state}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status && (
            <p className="text-sm text-muted-foreground">
              Checking installation status...
            </p>
          )}

          {status?.state === "error" && (
            <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-700">
              {status.error}
            </div>
          )}

          {status && status.state !== "error" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Templates</p>
              {status.templates.map((t) => (
                <div key={t.name} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      t.exists ? "bg-green-500" : "bg-muted-foreground/30",
                    )}
                  />
                  <span>{t.name}</span>
                  {t.exists && (
                    <span className="text-xs text-muted-foreground">
                      {t.templateId}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {progress && (
            <div className="space-y-1 border-t pt-4">
              <p className="text-sm font-medium mb-2">Progress</p>
              {progress.steps.map((step) => (
                <StepIndicator key={step.id} step={step} />
              ))}
            </div>
          )}

          {status?.state === "not-installed" && !isInstalling && (
            <Button onClick={handleInstall} className="w-full">
              Install ComponentForge Prerequisites
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Settings card — visible once installation is complete */}
      {isInstalled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Settings
              {checkingSettings ? (
                <Badge colorScheme="neutral">checking...</Badge>
              ) : openAiKeySet ? (
                <Badge colorScheme="success">configured</Badge>
              ) : (
                <Badge colorScheme="warning">action needed</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!openAiKeySet && !checkingSettings && (
              <Alert>
                <AlertTitle>OpenAI API Key Required</AlertTitle>
                <AlertDescription>
                  An OpenAI API key is required for AI-powered component
                  generation. Please configure it before continuing.
                </AlertDescription>
              </Alert>
            )}
            <Button
              variant={openAiKeySet ? "outline" : "default"}
              onClick={() => setSettingsOpen(true)}
              className="w-full"
            >
              {openAiKeySet ? "Manage Settings" : "Configure Settings"}
            </Button>
          </CardContent>
        </Card>
      )}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        authoringService={service.getAuthoringService()}
        onSaved={handleSettingsSaved}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button onClick={goNext} disabled={!isReady}>
          Continue
        </Button>
      </div>
    </div>
  );
}
