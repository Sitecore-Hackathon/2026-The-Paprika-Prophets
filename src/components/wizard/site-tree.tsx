"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMarketplaceClient } from "@/components/providers/marketplace-provider";
import { useTenantContext } from "@/components/providers/tenant-provider";
import { AuthoringService } from "@/lib/services/authoring-service";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/tailwind";
import {
  mdiChevronDown,
  mdiChevronRight,
  mdiFolder,
  mdiFolderOpen,
  mdiLoading,
} from "@mdi/js";
import type { SitecoreItem } from "@/lib/types/graphql";

export type SelectedTreeItem = {
  itemId: string;
  name: string;
  path: string;
};

type TreeNodeProps = {
  node: SitecoreItem;
  level: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  childrenMap: Map<string, SitecoreItem[]>;
  loadingPath: string | null;
  onExpand: (node: SitecoreItem) => void;
  onSelect: (item: SelectedTreeItem) => void;
};

function TreeNode({
  node,
  level,
  selectedPath,
  expandedPaths,
  childrenMap,
  loadingPath,
  onExpand,
  onSelect,
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isLoading = loadingPath === node.path;
  const isSelected = selectedPath === node.path;
  const children = childrenMap.get(node.path);

  return (
    <div>
      <div
        className={cn(
          "flex items-center rounded-md transition-colors w-full overflow-hidden",
          isSelected
            ? "bg-primary/10 border border-primary/40 text-primary"
            : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <Button
          size="icon-sm"
          variant="ghost"
          colorScheme="neutral"
          className="h-7 w-7 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onExpand(node);
          }}
        >
          {isLoading ? (
            <Icon path={mdiLoading} size={0.75} className="animate-spin w-4 h-4" />
          ) : isExpanded ? (
            <Icon path={mdiChevronDown} size={0.75} className="w-4 h-4" />
          ) : (
            <Icon path={mdiChevronRight} size={0.75} className="w-4 h-4" />
          )}
        </Button>

        <button
          type="button"
          className="flex items-center gap-1.5 flex-1 min-w-0 h-7 py-0 px-1 text-left"
          onClick={() => onSelect({ itemId: node.itemId, name: node.name, path: node.path })}
        >
          <Icon
            path={isExpanded ? mdiFolderOpen : mdiFolder}
            size={0.75}
            className={cn("shrink-0 w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")}
          />
          <span className={cn("text-sm truncate", isSelected && "font-semibold")}>
            {node.name}
          </span>
        </button>
      </div>

      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          {children && children.length > 0 && (
            <div>
              {children.map((child) => (
                <TreeNode
                  key={child.path}
                  node={child}
                  level={level + 1}
                  selectedPath={selectedPath}
                  expandedPaths={expandedPaths}
                  childrenMap={childrenMap}
                  loadingPath={loadingPath}
                  onExpand={onExpand}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

type SiteTreeProps = {
  rootPath?: string;
  selectedPath?: string | null;
  onSelect: (item: SelectedTreeItem) => void;
};

export const SiteTree = ({ rootPath = "/sitecore", selectedPath = null, onSelect }: SiteTreeProps) => {
  const client = useMarketplaceClient();
  const { selectedTenant } = useTenantContext();

  const sitecoreContextId = selectedTenant?.context?.preview ?? "";
  const authoring = useMemo(
    () => new AuthoringService(client, sitecoreContextId),
    [client, sitecoreContextId],
  );

  const [roots, setRoots] = useState<SitecoreItem[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Map<string, SitecoreItem[]>>(new Map());
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInitialLoading(true);
    setError(null);
    setExpandedPaths(new Set());
    setChildrenMap(new Map());

    const load = async () => {
      // Always load the root level first
      const rootItem = await authoring.getItem(rootPath);
      const roots = rootItem?.children?.nodes ?? [];
      setRoots(roots);

      // If a selectedPath is inside this tree, pre-expand all ancestor paths
      if (selectedPath && selectedPath.startsWith(rootPath) && selectedPath !== rootPath) {
        const relative = selectedPath.slice(rootPath.length); // e.g. "/templates/Project/Leaf"
        const parts = relative.split("/").filter(Boolean);    // ["templates", "Project", "Leaf"]

        // Build the ancestor paths to expand (all but the leaf itself)
        const ancestorPaths: string[] = [];
        let current = rootPath;
        for (let i = 0; i < parts.length - 1; i++) {
          current = `${current}/${parts[i]}`;
          ancestorPaths.push(current);
        }

        // Fetch each ancestor's children in order and accumulate state
        const newExpanded = new Set<string>();
        const newChildrenMap = new Map<string, SitecoreItem[]>();

        for (const ancestorPath of ancestorPaths) {
          const item = await authoring.getItem(ancestorPath);
          const children = item?.children?.nodes ?? [];
          newExpanded.add(ancestorPath);
          newChildrenMap.set(ancestorPath, children);
        }

        setExpandedPaths(newExpanded);
        setChildrenMap(newChildrenMap);
      }
    };

    load()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load tree"),
      )
      .finally(() => setInitialLoading(false));
  }, [rootPath, selectedPath, sitecoreContextId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpand = useCallback(
    (node: SitecoreItem) => {
      const alreadyExpanded = expandedPaths.has(node.path);
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        alreadyExpanded ? next.delete(node.path) : next.add(node.path);
        return next;
      });

      if (!alreadyExpanded && !childrenMap.has(node.path)) {
        setLoadingPath(node.path);
        authoring
          .getItem(node.path)
          .then((item) => {
            const children = item?.children?.nodes ?? [];
            setChildrenMap((prev) => new Map(prev).set(node.path, children));
          })
          .catch((err: unknown) =>
            setError(err instanceof Error ? err.message : "Failed to load children"),
          )
          .finally(() => setLoadingPath(null));
      }
    },
    [expandedPaths, childrenMap], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Icon path={mdiLoading} className="w-5 h-5 animate-spin shrink-0" />
        <span className="text-sm">Loading tree…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="border rounded-md p-2 h-[420px] overflow-y-auto overflow-x-hidden">
      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground px-2 py-4">No items found</p>
      ) : (
        roots.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            level={0}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            childrenMap={childrenMap}
            loadingPath={loadingPath}
            onExpand={handleExpand}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
}
