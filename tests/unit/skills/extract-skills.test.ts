import { describe, expect, it } from "vitest";
import { extractSkillsFromText } from "@/server/scraping/skills";

describe("extractSkillsFromText", () => {
  it("finds known skills in free text, in order of first appearance", () => {
    const text = "We use React and TypeScript daily, plus some Python for data tooling.";
    expect(extractSkillsFromText(text)).toEqual(["React", "TypeScript", "Python"]);
  });

  it("matches skills with symbols correctly (C++, C#, .NET, Node.js)", () => {
    const text = "Experience with C++, C#, .NET, and Node.js is a plus.";
    expect(extractSkillsFromText(text)).toEqual(["C++", "C#", ".NET", "Node.js"]);
  });

  it("does not false-positive match a skill as a substring of another word", () => {
    // "Golang" should not spuriously also register "Go" as a separate hit before it.
    const text = "We're hiring a Golang engineer.";
    expect(extractSkillsFromText(text)).toEqual(["Golang"]);
  });

  it("strips HTML before scanning", () => {
    const text = "<p>Must know <strong>Kubernetes</strong> and <em>Docker</em>.</p>";
    expect(extractSkillsFromText(text)).toEqual(["Kubernetes", "Docker"]);
  });

  it("is case-insensitive but returns canonical casing", () => {
    const text = "javascript and postgresql required";
    expect(extractSkillsFromText(text)).toEqual(["JavaScript", "PostgreSQL"]);
  });

  it("dedupes each skill to a single entry", () => {
    const text = "Python, Python, and more Python.";
    expect(extractSkillsFromText(text)).toEqual(["Python"]);
  });

  it("caps results at the given limit", () => {
    const text = "React Vue Angular Svelte Node.js Django Flask Spring Rails GraphQL REST Docker Git";
    expect(extractSkillsFromText(text, 3)).toHaveLength(3);
  });

  it("returns an empty array for empty/undefined input", () => {
    expect(extractSkillsFromText(undefined)).toEqual([]);
    expect(extractSkillsFromText("")).toEqual([]);
    expect(extractSkillsFromText("   ")).toEqual([]);
  });
});
