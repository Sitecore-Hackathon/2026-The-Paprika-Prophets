"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { experimental_Agent } from "@sitecore-marketplace-sdk/xmc";
import type { SiteSettings } from "@/lib/types/agent";

export type SiteContextType = {
  selectedSite: experimental_Agent.SiteBasicModel | null;
  setSelectedSite: (site: experimental_Agent.SiteBasicModel | null) => void;
  siteDetails: experimental_Agent.SiteInformationResponse | null;
  setSiteDetails: (details: experimental_Agent.SiteInformationResponse | null) => void;
  siteSettings: SiteSettings | null;
  setSiteSettings: (settings: SiteSettings | null) => void;
  resetSiteContext: () => void;
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSite, setSelectedSite] = useState<experimental_Agent.SiteBasicModel | null>(null);
  const [siteDetails, setSiteDetails] = useState<experimental_Agent.SiteInformationResponse | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  const resetSiteContext = useCallback(() => {
    setSelectedSite(null);
    setSiteDetails(null);
    setSiteSettings(null);
  }, []);

  const value = useMemo<SiteContextType>(
    () => ({
      selectedSite,
      setSelectedSite,
      siteDetails,
      setSiteDetails,
      siteSettings,
      setSiteSettings,
      resetSiteContext,
    }),
    [selectedSite, siteDetails, siteSettings, resetSiteContext],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};

export const useSiteContext = (): SiteContextType => {
  const context = useContext(SiteContext);
  if (!context) throw new Error("useSiteContext must be used within a SiteProvider");
  return context;
};
