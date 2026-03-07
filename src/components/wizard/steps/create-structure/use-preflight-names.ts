"use client";

import { useEffect, useState } from "react";
import type { AuthoringService } from "@/lib/services/authoring-service";

/**
 * Resolves unique Sitecore item names for a list of desired names under a given parent.
 * Re-runs whenever parentId, names, authoringService, or refreshKey changes.
 */
export function usePreflightNames(
  parentId: string,
  names: string[],
  authoringService: AuthoringService,
  refreshKey = 0,
): { preflightNames: Record<string, string> | null; preflightLoading: boolean } {
  const [preflightNames, setPreflightNames] = useState<Record<string, string> | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);

  useEffect(() => {
    if (!parentId.trim() || names.length === 0) {
      setPreflightNames(null);
      return;
    }
    setPreflightLoading(true);
    Promise.all(names.map((name) => authoringService.getUniqueName(parentId, name)))
      .then((resolved) => {
        const map: Record<string, string> = {};
        names.forEach((name, i) => { map[name] = resolved[i]; });
        setPreflightNames(map);
      })
      .catch(() => setPreflightNames(null))
      .finally(() => setPreflightLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, authoringService, refreshKey, names.join(",")]);

  return { preflightNames, preflightLoading };
}
