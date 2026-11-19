import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

const READMES = [
  ["README.md", "English"],
  ["README_ZH.md", "中文"],
  ["README_JA.md", "日本語"],
  ["README_DE.md", "Deutsch"],
] as const;

const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

describe.each(READMES)("%s", (file) => {
  it("exists", () => {
    expect(existsSync(path.join(ROOT, file))).toBe(true);
  });

  const text = existsSync(path.join(ROOT, file)) ? read(file) : "";

  it("links every other README from its language switcher", () => {
    const switcher = text
      .split("\n")
      .find(
        (line) => line.includes("(CHANGELOG.md)") && line.includes("README"),
      );
    expect(switcher, "language switcher line").toBeDefined();
    for (const [other, name] of READMES) {
      if (other === file) {
        expect(switcher).toContain(name);
        expect(switcher).not.toContain(`(${other})`);
      } else {
        expect(switcher).toContain(`[${name}](${other})`);
      }
    }
  });

  it("uses the four Classic screenshots and the Classic release channel", () => {
    expect(
      [
        ...text.matchAll(/<img src="assets\/screenshots\/classic\/([^"]+)"/g),
      ].map((match) => match[1]),
    ).toEqual(["main.png", "apps.png", "aggregation.png", "usage.png"]);
    expect(text).toContain(
      "https://github.com/Yanxcyan/cc-switch-classic/releases",
    );
  });
});
