import { describe, expect, it } from "vitest";
import { parseContent } from "./geoMarkers";

describe("parseContent", () => {
  it("returns a single text segment when there are no markers", () => {
    expect(parseContent("Just some prose.")).toEqual([{ type: "text", value: "Just some prose." }]);
  });

  it("extracts a single marker", () => {
    expect(parseContent("{/api/v1/geography/England}")).toEqual([
      { type: "marker", endpoint: "/api/v1/geography/England" },
    ]);
  });

  it("splits prose around a marker", () => {
    expect(parseContent("Before\n\n{/api/v1/geography/England}\n\nAfter")).toEqual([
      { type: "text", value: "Before\n\n" },
      { type: "marker", endpoint: "/api/v1/geography/England" },
      { type: "text", value: "\n\nAfter" },
    ]);
  });

  it("extracts multiple markers in order", () => {
    expect(parseContent("{/a}\n{/b}{/c}")).toEqual([
      { type: "marker", endpoint: "/a" },
      { type: "text", value: "\n" },
      { type: "marker", endpoint: "/b" },
      { type: "marker", endpoint: "/c" },
    ]);
  });

  it("preserves query strings within the endpoint", () => {
    expect(parseContent("{/api/v1/geography/England?lang=en}")).toEqual([
      { type: "marker", endpoint: "/api/v1/geography/England?lang=en" },
    ]);
  });

  it("ignores braces that do not start with a slash", () => {
    expect(parseContent("a {not a marker} b")).toEqual([
      { type: "text", value: "a {not a marker} b" },
    ]);
  });
});
