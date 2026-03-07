import { cn } from "../tailwind";

describe("cn", () => {
  it.each([
    [["px-2", "py-1"], "px-2 py-1"],
    [["px-2 py-1", "p-3"], "p-3"],
    [["text-red-500", "text-blue-500"], "text-blue-500"],
    [["font-bold", undefined, "text-sm"], "font-bold text-sm"],
    [["", null, "block"], "block"],
    [[], ""],
  ] as [unknown[], string][])("cn(%j) → %j", (inputs, expected) => {
    expect(cn(...(inputs as string[]))).toBe(expected);
  });
});
