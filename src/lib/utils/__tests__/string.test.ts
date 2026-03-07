import { toKebab, isValidGuid } from "../string";

describe("toKebab", () => {
  it.each([
    ["AnniversaryBanner", "anniversary-banner"],
    ["PromoImage", "promo-image"],
    ["HeroCTABanner", "hero-cta-banner"],
    ["HTMLParser", "html-parser"],
    ["SimpleText", "simple-text"],
    ["A", "a"],
    ["already-kebab", "already-kebab"],
    ["lowercase", "lowercase"],
    ["ABCDef", "abc-def"],
    ["getHTTPSUrl", "get-https-url"],
  ])("toKebab(%j) → %j", (input, expected) => {
    expect(toKebab(input)).toBe(expected);
  });
});

describe("isValidGuid", () => {
  it.each([
    ["a1b2c3d4-e5f6-7890-abcd-ef1234567890", true],
    ["{a1b2c3d4-e5f6-7890-abcd-ef1234567890}", true],
    ["A1B2C3D4-E5F6-7890-ABCD-EF1234567890", true],
    ["{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}", true],
    ["  a1b2c3d4-e5f6-7890-abcd-ef1234567890  ", true],
    ["not-a-guid", false],
    ["", false],
    ["a1b2c3d4-e5f6-7890-abcd", false],
    ["a1b2c3d4-e5f6-7890-abcd-ef1234567890-extra", false],
    ["{a1b2c3d4-e5f6-7890-abcd-ef1234567890", false],
    ["a1b2c3d4e5f678900abcdef1234567890", false],
  ])("isValidGuid(%j) → %j", (input, expected) => {
    expect(isValidGuid(input)).toBe(expected);
  });
});
