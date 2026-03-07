import type {
  ComponentField,
  AnalyzedComponent,
  DesignHints,
} from "@/lib/types/component";
import { REFERENCE_FIELD_TYPES } from "@/lib/types/component";

const DESIGN_HINT_KEYS: (keyof DesignHints)[] = [
  "layout", "colors", "typography", "spacing", "borders", "shadows", "backgroundStyle", "iconography", "responsiveHint",
];

const normalizeFields = (raw: unknown): ComponentField[] => {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((f) => ({
    name: String(f.name ?? ""),
    displayName: String(f.displayName ?? f.name ?? ""),
    type: String(f.type ?? "Single-Line Text"),
    description: String(f.description ?? ""),
    source: String(f.source ?? ""),
  }));
};

const normalizeSuggestions = (raw: unknown): string => {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw))
    return (raw as unknown[])
      .map((s) =>
        typeof s === "string"
          ? s
          : String(
              (s as Record<string, unknown>).description ??
                (s as Record<string, unknown>).name ??
                s,
            ),
      )
      .join(". ");
  return "";
};

const normalizeDesignHints = (raw: unknown): DesignHints | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const hints = {} as Record<string, string>;
  for (const key of DESIGN_HINT_KEYS) {
    hints[key] = String(obj[key] ?? "");
  }
  return hints as unknown as DesignHints;
};

export const emptyField = (): ComponentField => ({
  name: "",
  displayName: "",
  type: "Single-Line Text",
  description: "",
  source: "",
});

export const normalizeComponents = (
  raw: Record<string, unknown>,
): AnalyzedComponent[] => {
  const list: Record<string, unknown>[] = Array.isArray(raw.components)
    ? (raw.components as Record<string, unknown>[])
    : [raw];

  const normalized = list.map((c) => ({
    componentName: String(c.componentName ?? c.name ?? "Unnamed"),
    description: String(c.description ?? ""),
    visualLocation: String(c.visualLocation ?? ""),
    isListComponent: Boolean(c.isListComponent ?? false),
    childTemplateName: c.childTemplateName ? String(c.childTemplateName) : null,
    isDatasourceFolder: Boolean(c.isDatasourceFolder ?? false),
    parentTemplateName: c.parentTemplateName
      ? String(c.parentTemplateName)
      : null,
    fields: normalizeFields(c.fields),
    suggestions: normalizeSuggestions(c.suggestions),
    designHints: normalizeDesignHints(c.designHints),
  }));

  for (const comp of normalized) {
    if (comp.isListComponent && comp.childTemplateName) {
      for (const field of comp.fields) {
        if (REFERENCE_FIELD_TYPES.has(field.type) && !field.source) {
          field.source = `query:./*`;
        }
      }
    }
  }

  return normalized;
};
