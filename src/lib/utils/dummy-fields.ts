import type { Faker } from "@faker-js/faker";
import {
  fakerAR, fakerCS_CZ, fakerDA, fakerDE, fakerEL, fakerEN,
  fakerES, fakerFI, fakerFR, fakerHE, fakerHR, fakerHU,
  fakerID_ID, fakerIT, fakerJA, fakerKO, fakerNB_NO, fakerNL,
  fakerPL, fakerPT_BR, fakerRO, fakerRU, fakerSK, fakerSV,
  fakerTH, fakerTR, fakerUK, fakerVI, fakerZH_CN,
} from "@faker-js/faker";

/** Returns a locale-aware dummy value for a Sitecore field type. */
export const generateDummyFieldValue = (fieldType: string, language = "en"): string => {
  const f = getFaker(language);
  const type = fieldType.toLowerCase().trim();

  switch (type) {
    case "single-line text": return singleLineText(f);
    case "multi-line text":  return multiLineText(f);
    case "rich text":        return richText(f);
    case "number":           return numberValue(f);
    case "integer":          return integerValue(f);
    case "datetime":         return datetimeValue(f);
    case "date":             return dateValue(f);
    case "checkbox":         return checkboxValue(f);
    case "general link":     return generalLink(f);
    case "image":            return `<image mediaid='{04DAD0FD-DB66-4070-881F-17264CA257E1}' alt='${singleLineText(f)}'/>`;
    case "file":             return "";
    // Require item GUIDs – leave blank so they don't break validation
    case "droplink":
    case "droptree":
    case "multilist":
    case "treelist":
    case "name value list":  return "";
    default:                 return singleLineText(f);
  }
};

function getFaker(language: string): Faker {
  const lang = language.toLowerCase();
  if (lang.startsWith("ar")) return fakerAR;
  if (lang.startsWith("cs")) return fakerCS_CZ;
  if (lang.startsWith("da")) return fakerDA;
  if (lang.startsWith("de")) return fakerDE;
  if (lang.startsWith("el")) return fakerEL;
  if (lang.startsWith("es")) return fakerES;
  if (lang.startsWith("fi")) return fakerFI;
  if (lang.startsWith("fr")) return fakerFR;
  if (lang.startsWith("he")) return fakerHE;
  if (lang.startsWith("hr")) return fakerHR;
  if (lang.startsWith("hu")) return fakerHU;
  if (lang.startsWith("id")) return fakerID_ID;
  if (lang.startsWith("it")) return fakerIT;
  if (lang.startsWith("ja")) return fakerJA;
  if (lang.startsWith("ko")) return fakerKO;
  if (lang.startsWith("nb") || lang.startsWith("no")) return fakerNB_NO;
  if (lang.startsWith("nl")) return fakerNL;
  if (lang.startsWith("pl")) return fakerPL;
  if (lang.startsWith("pt")) return fakerPT_BR;
  if (lang.startsWith("ro")) return fakerRO;
  if (lang.startsWith("ru")) return fakerRU;
  if (lang.startsWith("sk")) return fakerSK;
  if (lang.startsWith("sv")) return fakerSV;
  if (lang.startsWith("th")) return fakerTH;
  if (lang.startsWith("tr")) return fakerTR;
  if (lang.startsWith("uk")) return fakerUK;
  if (lang.startsWith("vi")) return fakerVI;
  if (lang.startsWith("zh")) return fakerZH_CN;
  return fakerEN;
}

function singleLineText(f: Faker): string {
  return f.lorem.sentence({ min: 3, max: 8 }).replace(/\.$/, "");
}

function multiLineText(f: Faker): string {
  return f.lorem.paragraphs({ min: 1, max: 2 });
}

function richText(f: Faker): string {
  return `<p>${f.lorem.paragraph()}</p>\n<p>${f.lorem.paragraph()}</p>`;
}

function numberValue(f: Faker): string {
  return String(f.number.int({ min: 1, max: 9999 }));
}

function integerValue(f: Faker): string {
  return String(f.number.int({ min: 0, max: 1000 }));
}

// Sitecore datetime format: yyyyMMddTHHmmssZ
function datetimeValue(f: Faker): string {
  const d = f.date.recent({ days: 365 });
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}Z`
  );
}

function dateValue(f: Faker): string {
  const d = f.date.recent({ days: 365 });
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T000000Z`;
}

function generalLink(f: Faker): string {
  const url = f.internet.url();
  const text = f.word.words(2);
  return `<link text='${text}' linktype='external' url='${url}' target='_blank' />`;
}

function checkboxValue(f: Faker): string {
  return f.datatype.boolean() ? "1" : "0";
}
