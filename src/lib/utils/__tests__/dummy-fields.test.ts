import { generateDummyFieldValue } from "../dummy-fields";

describe("generateDummyFieldValue", () => {
  describe("returns non-empty strings for content field types", () => {
    it.each([
      "Single-Line Text",
      "Multi-Line Text",
      "Rich Text",
      "Number",
      "Integer",
      "Datetime",
      "Date",
      "Checkbox",
      "General Link",
      "Image",
    ])("type=%j returns a non-empty string", (fieldType) => {
      const value = generateDummyFieldValue(fieldType);
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    });
  });

  describe("returns empty strings for reference field types", () => {
    it.each([
      "Droplink",
      "Droptree",
      "Multilist",
      "Treelist",
      "Name Value List",
      "File",
    ])("type=%j returns empty string", (fieldType) => {
      expect(generateDummyFieldValue(fieldType)).toBe("");
    });
  });

  describe("field type-specific format checks", () => {
    it("Rich Text contains HTML tags", () => {
      expect(generateDummyFieldValue("Rich Text")).toMatch(/<p>.*<\/p>/);
    });

    it("Number returns a numeric string", () => {
      expect(Number(generateDummyFieldValue("Number"))).not.toBeNaN();
    });

    it("Integer returns an integer string", () => {
      const val = generateDummyFieldValue("Integer");
      expect(Number.isInteger(Number(val))).toBe(true);
    });

    it("Checkbox returns '0' or '1'", () => {
      const val = generateDummyFieldValue("Checkbox");
      expect(["0", "1"]).toContain(val);
    });

    it("Datetime matches Sitecore format yyyyMMddTHHmmssZ", () => {
      expect(generateDummyFieldValue("Datetime")).toMatch(
        /^\d{8}T\d{6}Z$/,
      );
    });

    it("Date matches Sitecore format yyyyMMddT000000Z", () => {
      expect(generateDummyFieldValue("Date")).toMatch(
        /^\d{8}T000000Z$/,
      );
    });

    it("General Link contains <link> tag", () => {
      expect(generateDummyFieldValue("General Link")).toMatch(
        /<link .+\/>/,
      );
    });

    it("Image contains <image> tag with mediaid", () => {
      expect(generateDummyFieldValue("Image")).toMatch(
        /<image mediaid='\{.*\}'/,
      );
    });
  });

  describe("locale support", () => {
    it.each(["en", "fr", "de", "ja", "zh", "es", "pt"])(
      "generates content for locale=%j without throwing",
      (locale) => {
        expect(() =>
          generateDummyFieldValue("Single-Line Text", locale),
        ).not.toThrow();
        expect(
          generateDummyFieldValue("Single-Line Text", locale).length,
        ).toBeGreaterThan(0);
      },
    );

    it("falls back to English for unknown locale", () => {
      expect(() =>
        generateDummyFieldValue("Single-Line Text", "xx-unknown"),
      ).not.toThrow();
    });
  });

  it("is case-insensitive for field type", () => {
    expect(generateDummyFieldValue("SINGLE-LINE TEXT").length).toBeGreaterThan(0);
    expect(generateDummyFieldValue("single-line text").length).toBeGreaterThan(0);
  });

  it("falls back to single-line text for unknown types", () => {
    const val = generateDummyFieldValue("SomethingWeird");
    expect(typeof val).toBe("string");
    expect(val.length).toBeGreaterThan(0);
  });
});
