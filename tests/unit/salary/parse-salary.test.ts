import { describe, expect, it } from "vitest";
import { parseSalary } from "@/server/scraping/salary/parse-salary";
import { SALARY_CASES } from "../../fixtures/salary-strings";

describe("parseSalary", () => {
  for (const { input, expected } of SALARY_CASES) {
    it(`parses "${input}"`, () => {
      expect(parseSalary(input)).toEqual(expected);
    });
  }

  it("returns an empty object for null/undefined", () => {
    expect(parseSalary(null)).toEqual({});
    expect(parseSalary(undefined)).toEqual({});
  });
});
