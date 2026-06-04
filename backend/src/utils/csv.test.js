import { describe, it, expect } from "vitest";
import { csvEscape, toCsv } from "./csv.js";

describe("csvEscape", () => {
  it("returns empty string for null", () => {
    expect(csvEscape(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(csvEscape(undefined)).toBe("");
  });

  it("returns plain string unchanged when no special chars", () => {
    expect(csvEscape("hello")).toBe("hello");
  });

  it("wraps value in quotes when it contains a comma", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
  });

  it("wraps value in quotes when it contains a double-quote and escapes inner quotes", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps value in quotes when it contains a newline", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps value in quotes when it contains a carriage return", () => {
    expect(csvEscape("line1\rline2")).toBe('"line1\rline2"');
  });

  it("converts numbers to string", () => {
    expect(csvEscape(42)).toBe("42");
  });

  it("handles empty string", () => {
    expect(csvEscape("")).toBe("");
  });
});

describe("toCsv", () => {
  const headers = [
    { label: "Name", value: "name" },
    { label: "Age", value: "age" },
  ];

  it("generates CSV with BOM, header row and data rows", () => {
    const rows = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];

    const csv = toCsv(rows, headers);
    expect(csv.startsWith("\uFEFF")).toBe(true);

    const lines = csv.slice(1).split("\n");
    expect(lines[0]).toBe("Name,Age");
    expect(lines[1]).toBe("Alice,30");
    expect(lines[2]).toBe("Bob,25");
  });

  it("returns only BOM + header when rows is empty", () => {
    const csv = toCsv([], headers);
    expect(csv).toBe("\uFEFFName,Age");
  });

  it("supports function-based value extractors in headers", () => {
    const fnHeaders = [
      { label: "Full", value: (row) => `${row.first} ${row.last}` },
    ];
    const rows = [{ first: "John", last: "Doe" }];

    const csv = toCsv(rows, fnHeaders);
    const lines = csv.slice(1).split("\n");
    expect(lines[1]).toBe("John Doe");
  });

  it("escapes special characters in data cells", () => {
    const rows = [{ name: 'O"Brien', age: 40 }];
    const csv = toCsv(rows, headers);
    const lines = csv.slice(1).split("\n");
    expect(lines[1]).toBe('"O""Brien",40');
  });

  it("escapes special characters in header labels", () => {
    const specialHeaders = [
      { label: "Name, First", value: "name" },
    ];
    const csv = toCsv([], specialHeaders);
    expect(csv.slice(1)).toBe('"Name, First"');
  });
});
