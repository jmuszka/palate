import { describe, expect, it, vi } from "vitest";
import type { FeatureCollection } from "geojson";
import {
  normalizeGeometry,
  escapeHtml,
  renderPopup,
  extendBounds,
  fitToGeometry,
} from "./mapGeometry";

const { LngLatBounds } = vi.hoisted(() => {
  class MockLngLatBounds {
    extended: Array<[number, number]> = [];
    extend(coord: [number, number]) {
      this.extended.push(coord);
    }
    isEmpty() {
      return this.extended.length === 0;
    }
  }
  return { LngLatBounds: MockLngLatBounds };
});

vi.mock("maplibre-gl", () => ({
  default: {
    LngLatBounds,
    Map: class {},
    config: {},
    Popup: class {},
    GeoJSONSource: class {},
  },
}));

describe("normalizeGeometry", () => {
  it("deduplicates features by id", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "en" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "en" },
          geometry: { type: "Point", coordinates: [1, 1] },
        },
      ],
    };

    const result = normalizeGeometry(fc);
    expect(result.features).toHaveLength(1);
  });

  it("falls back to name for id and defaults name to id", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "English" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "fr" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    };

    const result = normalizeGeometry(fc);
    expect(result.features[0].properties).toEqual({ id: "English", name: "English", count: 1 });
    expect(result.features[1].properties).toEqual({ id: "fr", name: "fr", count: 1 });
  });

  it("rounds a positive count and defaults invalid counts to 1", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "a", count: 4.6 },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "b", count: -2 },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "c", count: "nope" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    };

    const result = normalizeGeometry(fc);
    expect(result.features[0].properties?.count).toBe(5);
    expect(result.features[1].properties?.count).toBe(1);
    expect(result.features[2].properties?.count).toBe(1);
  });

  it("skips features with no id or name", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } },
      ],
    };

    expect(normalizeGeometry(fc).features).toHaveLength(0);
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;",
    );
  });
});

describe("renderPopup", () => {
  it("wraps the escaped name in a styled span", () => {
    expect(renderPopup({ id: "x", name: "A&B", count: 1 })).toBe(
      '<span style="font-size:13px;font-weight:600;color:#18181b;">A&amp;B</span>',
    );
  });
});

describe("extendBounds", () => {
  it("extends the bounds with a leaf coordinate", () => {
    const extend = vi.fn();
    extendBounds({ extend } as never, [1, 2]);
    expect(extend).toHaveBeenCalledWith([1, 2]);
  });

  it("recurses into nested coordinate arrays", () => {
    const extend = vi.fn();
    extendBounds({ extend } as never, [
      [1, 2],
      [3, 4],
    ]);
    expect(extend).toHaveBeenCalledTimes(2);
    expect(extend).toHaveBeenNthCalledWith(1, [1, 2]);
    expect(extend).toHaveBeenNthCalledWith(2, [3, 4]);
  });
});

describe("fitToGeometry", () => {
  it("calls fitBounds when geometry has coordinates", () => {
    const fitBounds = vi.fn();
    const geometry: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [1, 2] } },
      ],
    };

    fitToGeometry({ fitBounds } as never, geometry);

    expect(fitBounds).toHaveBeenCalledTimes(1);
    const [bounds, options] = fitBounds.mock.calls[0];
    expect(bounds).toBeInstanceOf(LngLatBounds);
    expect(options).toEqual({ padding: 60, maxZoom: 8, animate: false });
  });

  it("does not call fitBounds for empty geometry", () => {
    const fitBounds = vi.fn();
    fitToGeometry({ fitBounds } as never, { type: "FeatureCollection", features: [] });

    expect(fitBounds).not.toHaveBeenCalled();
  });
});
