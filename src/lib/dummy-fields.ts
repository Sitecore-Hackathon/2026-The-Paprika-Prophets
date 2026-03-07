import Chance from "chance";

const chance = new Chance();

function singleLineText(language: string): string {
  void language;
  return chance.sentence({ words: chance.integer({ min: 3, max: 8 }) }).replace(/\.$/, "");
}

function multiLineText(language: string): string {
  void language;
  const count = chance.integer({ min: 2, max: 3 });
  return Array.from({ length: count }, () => chance.sentence({ words: chance.integer({ min: 6, max: 15 }) })).join(" ");
}

function richText(language: string): string {
  void language;
  return `<p>${multiLineText(language)}</p>\n<p>${multiLineText(language)}</p>`;
}

function headline(language: string): string {
  void language;
  return chance.capitalize(
    chance.sentence({ words: chance.integer({ min: 3, max: 7 }) }).replace(/\.$/, ""),
  );
}

function numberValue(): string {
  return String(chance.integer({ min: 1, max: 9999 }));
}

// Sitecore datetime format: yyyyMMddTHHmmssZ
function datetimeValue(): string {
  const d = chance.date({ year: new Date().getFullYear() }) as Date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}Z`
  );
}

function dateValue(): string {
  const d = chance.date({ year: new Date().getFullYear() }) as Date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T000000Z`;
}

function generalLink(): string {
  const url = chance.url({ protocol: "https", domain: chance.domain() });
  const text = chance.capitalize(chance.word({ syllables: 2 }));
  return `<link text='${text}' linktype='external' url='${url}' target='_blank' />`;
}

function checkboxValue(): string {
  return chance.bool() ? "1" : "0";
}

function integerValue(): string {
  return String(chance.integer({ min: 0, max: 1000 }));
}

/** Returns a readable dummy value for a Sitecore field. Field name heuristics take precedence over type. */
export function generateDummyFieldValue(
  fieldType: string,
  language = "en",
): string {
  const type = fieldType.toLowerCase().trim();

  switch (type) {
    case "single-line text":
      return singleLineText(language);

    case "multi-line text":
      return multiLineText(language);

    case "rich text":
      return richText(language);

    case "number":
      return numberValue();

    case "integer":
      return integerValue();

    case "datetime":
      return datetimeValue();

    case "date":
      return dateValue();

    case "checkbox":
      return checkboxValue();

    case "general link":
      return generalLink();

    case "image":
      return `<image mediaid='{04DAD0FD-DB66-4070-881F-17264CA257E1}' alt='${singleLineText(language)}'/>`;
    case "file":
      return "";

    // Require item GUIDs – leave blank
    case "droplink":
    case "droptree":
    case "multilist":
    case "treelist":
    case "name value list":
      return "";

    default:
      return singleLineText(language);
  }
}
