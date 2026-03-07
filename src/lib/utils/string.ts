/** Convert PascalCase to kebab-case: "AnniversaryBanner" → "anniversary-banner" */
export const toKebab = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

const GUID_BARE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUID_BRACED = /^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/i;

/** Test whether a string is a valid GUID (bare or braced). */
export const isValidGuid = (value: string): boolean => {
  const v = value.trim();
  return GUID_BARE.test(v) || GUID_BRACED.test(v);
};

/** Convert a data-URL to a Blob without `fetch` (avoids CSP connect-src). */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};
