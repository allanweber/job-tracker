import { describe, expect, it } from "vitest";
import { parseCsv, csvField, buildCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses plain comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing commas and newlines", () => {
    const text = 'name,notes\n"Acme, Inc.","line one\nline two"';
    expect(parseCsv(text)).toEqual([
      ["name", "notes"],
      ["Acme, Inc.", "line one\nline two"],
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsv('field\n"she said ""hi"""')).toEqual([["field"], ['she said "hi"']]);
  });

  it("treats CRLF and lone CR as row terminators", () => {
    expect(parseCsv("a,b\r\n1,2\r3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    expect(parseCsv("\uFEFFa,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ignores a trailing newline instead of producing a phantom row", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("csvField", () => {
  it("leaves plain text untouched", () => {
    expect(csvField("hello")).toBe("hello");
  });

  it("quotes fields containing a comma, quote, or newline", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("defuses formula-injection prefixes (=, +, -, @, tab, CR)", () => {
    // Contains a comma and quotes, so it also gets CSV-quoted on top of the
    // leading-quote defense.
    expect(csvField('=HYPERLINK("http://evil.test","click")')).toBe(
      '"\'=HYPERLINK(""http://evil.test"",""click"")"',
    );
    expect(csvField("+1-555-0100")).toBe("'+1-555-0100");
    expect(csvField("@mention")).toBe("'@mention");
    // A field that starts with one of the trigger characters AND needs
    // quoting gets both defenses composed correctly.
    expect(csvField('=A1,"x"')).toBe(`"'=A1,""x"""`);
  });

  it("does not treat a plain negative number as a formula trigger falsely-positively beyond the safe prefix rule", () => {
    // Negative numbers are still prefixed per the mitigation (Excel/Sheets
    // do special-case a small set of leading characters); this documents
    // the (intentional, conservative) behavior rather than an edge case.
    expect(csvField("-50000")).toBe("'-50000");
  });
});

describe("buildCsv", () => {
  it("joins rows with CRLF and prepends a UTF-8 BOM", () => {
    const csv = buildCsv([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(csv).toBe("\uFEFFa,b\r\n1,2\r\n");
  });

  it("round-trips through parseCsv", () => {
    const rows = [
      ["Position", "Notes"],
      ["Engineer, Sr.", 'Said "yes"\nfollow up'],
    ];
    const csv = buildCsv(rows);
    expect(parseCsv(csv)).toEqual(rows);
  });
});
