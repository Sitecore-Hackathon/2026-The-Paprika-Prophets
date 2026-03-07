import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { AuthoringService } from "./authoring-service";
import { INSTALLATION_TEMPLATES } from "@/lib/installation/templates";
import {
  INSTALLATION_ITEMS,
  type ItemConfigWithTemplateName,
} from "@/lib/installation/items";
import { SITECORE_IDS, SITECORE_PATHS } from "@/lib/installation/constants";
import type { ItemConfig, TemplateConfig } from "@/lib/graphql/types";

export type InstallationState =
  | "checking"
  | "not-installed"
  | "awaiting-approval"
  | "installing"
  | "installed"
  | "error";

export interface InstallationStatus {
  state: InstallationState;
  templates: TemplateCheckResult[];
  moduleFolderExists: boolean;
  message?: string;
  error?: string;
}

export interface TemplateCheckResult {
  name: string;
  path: string;
  exists: boolean;
  templateId?: string;
}

export interface InstallationStep {
  id: string;
  type: "template" | "item" | "folder";
  name: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  error?: string;
  result?: string;
}

export interface InstallationProgress {
  steps: InstallationStep[];
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
}

export class InstallationService {
  private authoringService: AuthoringService;
  private templateIdMap: Map<string, string> = new Map();
  private itemIdMap: Map<string, string> = new Map();
  private templateFolderId: string | null = null;

  constructor(client: ClientSDK, sitecoreContextId: string) {
    this.authoringService = new AuthoringService(client, sitecoreContextId);
  }

  /** Expose the underlying authoring service for field-level operations. */
  getAuthoringService(): AuthoringService {
    return this.authoringService;
  }

  async checkInstallation(): Promise<InstallationStatus> {
    try {
      const templateFolderExists = await this.checkTemplateFolderExists();
      const templateChecks = await this.checkTemplates();
      const moduleFolderExists = await this.checkModuleFolder();

      const allTemplatesExist = templateChecks.every((t) => t.exists);

      templateChecks.forEach((check) => {
        if (check.exists && check.templateId) {
          this.templateIdMap.set(check.name, check.templateId);
        }
      });

      const state: InstallationState =
        allTemplatesExist && moduleFolderExists && templateFolderExists
          ? "installed"
          : "not-installed";

      return {
        state,
        templates: templateChecks,
        moduleFolderExists,
        message:
          state === "installed"
            ? "All prerequisites are installed"
            : "Installation required",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        state: "error",
        templates: [],
        moduleFolderExists: false,
        error: message,
      };
    }
  }

  private async checkTemplates(): Promise<TemplateCheckResult[]> {
    const results: TemplateCheckResult[] = [];

    for (const templateConfig of INSTALLATION_TEMPLATES) {
      const path = `${templateConfig.parentPath}/${templateConfig.name}`;
      const item = await this.authoringService.getItem(path);

      results.push({
        name: templateConfig.name,
        path,
        exists: item !== null,
        templateId: item?.itemId,
      });
    }

    return results;
  }

  private async checkModuleFolder(): Promise<boolean> {
    const item = await this.authoringService.getItem(SITECORE_PATHS.SYSTEM.MODULES);
    return item !== null;
  }

  private async checkTemplateFolderExists(): Promise<boolean> {
    const item = await this.authoringService.getItem(
      SITECORE_PATHS.TEMPLATES.COMPONENT_FORGE,
    );
    return item !== null;
  }

  async install(
    onProgress?: (progress: InstallationProgress) => void,
  ): Promise<InstallationProgress> {
    const steps: InstallationStep[] = [];

    // Step for template folder creation
    steps.push({
      id: "folder-template-folder",
      type: "folder",
      name: "Folder: Component Forge (templates)",
      status: "pending",
    });

    INSTALLATION_TEMPLATES.forEach((template: TemplateConfig) => {
      steps.push({
        id: `template-${template.name}`,
        type: "template",
        name: `Template: ${template.name}`,
        status: "pending",
      });
    });

    INSTALLATION_ITEMS.forEach((item: ItemConfigWithTemplateName) => {
      steps.push({
        id: `item-${item.name}`,
        type: item.templateName.includes("Folder") ? "folder" : "item",
        name: `Item: ${item.name}`,
        status: "pending",
      });
    });

    const progress: InstallationProgress = {
      steps,
      currentStep: 0,
      totalSteps: steps.length,
      isComplete: false,
    };

    onProgress?.({ ...progress, steps: [...steps] });

    try {
      // 1. Create the template folder under User Defined
      const folderStep = steps[0];
      folderStep.status = "in-progress";
      progress.currentStep = 0;
      onProgress?.({ ...progress, steps: [...steps] });

      try {
        const folderItem = await this.authoringService.createItem({
          name: "Component Forge",
          templateId: SITECORE_IDS.TEMPLATES.FOLDER_TEMPLATE,
          parentId: SITECORE_IDS.TEMPLATES.USER_DEFINED,
          parentPath: SITECORE_PATHS.TEMPLATES.USER_DEFINED,
        });

        if (folderItem?.itemId) {
          this.templateFolderId = folderItem.itemId;
          folderStep.status = "completed";
          folderStep.result = folderItem.itemId;
        } else {
          throw new Error("Failed to create template folder");
        }
      } catch (error: unknown) {
        folderStep.status = "failed";
        folderStep.error =
          error instanceof Error ? error.message : "Unknown error";
        throw error;
      }

      onProgress?.({ ...progress, steps: [...steps] });

      // 2. Create templates inside the Component Forge folder
      for (let i = 0; i < INSTALLATION_TEMPLATES.length; i++) {
        const template = INSTALLATION_TEMPLATES[i];
        const step = steps[i + 1]; // offset by 1 for the folder step

        step.status = "in-progress";
        progress.currentStep = i + 1;
        onProgress?.({ ...progress, steps: [...steps] });

        try {
          // Override parentId with the dynamically-created folder ID
          const templateWithParent: TemplateConfig = {
            ...template,
            parentId: this.templateFolderId || template.parentId,
          };
          const result =
            await this.authoringService.createTemplate(templateWithParent);
          if (result) {
            this.templateIdMap.set(template.name, result.templateId);
            step.status = "completed";
            step.result = result.templateId;
          } else {
            throw new Error("Failed to create template");
          }
        } catch (error: unknown) {
          step.status = "failed";
          step.error = error instanceof Error ? error.message : "Unknown error";
          throw error;
        }

        onProgress?.({ ...progress, steps: [...steps] });
      }

      const itemStartIndex = INSTALLATION_TEMPLATES.length + 1; // +1 for folder step
      for (let i = 0; i < INSTALLATION_ITEMS.length; i++) {
        const item = INSTALLATION_ITEMS[i];
        const step = steps[itemStartIndex + i];

        step.status = "in-progress";
        progress.currentStep = itemStartIndex + i;
        onProgress?.({ ...progress, steps: [...steps] });

        try {
          const itemId = await this.installItem(item);
          if (itemId) {
            step.status = "completed";
            step.result = itemId;
          } else {
            throw new Error("Failed to create item");
          }
        } catch (error: unknown) {
          step.status = "failed";
          step.error = error instanceof Error ? error.message : "Unknown error";
        }

        onProgress?.({ ...progress, steps: [...steps] });
      }

      progress.isComplete = true;
      progress.currentStep = steps.length;
      onProgress?.({ ...progress, steps: [...steps] });

      return progress;
    } catch (error) {
      progress.isComplete = true;
      onProgress?.({ ...progress, steps: [...steps] });
      throw error;
    }
  }

  private async installItem(config: ItemConfigWithTemplateName): Promise<string | null> {
    let templateId = config.templateId;
    if (!templateId) {
      templateId = this.templateIdMap.get(config.templateName) || undefined;
    }

    if (!templateId) {
      throw new Error(`Template ID not found for: ${config.templateName}`);
    }

    let parentId = config.parentId;
    const parentItemId = this.itemIdMap.get(config.parentPath);
    if (parentItemId) {
      parentId = parentItemId;
    }

    const itemConfig: ItemConfig = {
      ...config,
      templateId,
      parentId,
    };

    const item = await this.authoringService.createItem(itemConfig);

    if (item?.itemId) {
      const itemPath = `${config.parentPath}/${config.name}`;
      this.itemIdMap.set(itemPath, item.itemId);
    }

    return item?.itemId || null;
  }

  async uninstall(): Promise<void> {
    for (const item of [...INSTALLATION_ITEMS].reverse()) {
      const path = `${item.parentPath}/${item.name}`;
      try {
        await this.authoringService.deleteItem(path, false);
      } catch {
        // continue cleanup
      }
    }

    for (const template of INSTALLATION_TEMPLATES) {
      const path = `${template.parentPath}/${template.name}`;
      try {
        await this.authoringService.deleteItem(path, false);
      } catch {
        // continue cleanup
      }
    }

    // Delete the template folder itself
    try {
      await this.authoringService.deleteItem(
        SITECORE_PATHS.TEMPLATES.COMPONENT_FORGE,
        false,
      );
    } catch {
      // continue cleanup
    }
  }
}
