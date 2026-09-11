import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import rewind from "@turf/rewind";
import { toast } from "./toast";
import { normalizeGeometry, fitToGeometry, renderPopup } from "./mapGeometry";
import type { NormalizedProps } from "./mapGeometry";

const GEOMETRY_SOURCE = "etymology-geometry";
const FILL_LAYER_ID = `${GEOMETRY_SOURCE}-fill`;
const HALO_LAYER_ID = `${GEOMETRY_SOURCE}-halo`;
const EMPTY_FC: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const HEAT_LIGHT = "#e8ebff";
const HEAT_MID = "#8b93f8";
const HEAT_DARK = "#312e81";
const DIM_FILL = "#e4e4e7";
// Halo ramp: the heat colors mixed ~40% toward white. Over a light basemap the
// semi-transparent halo would otherwise compound with the fill and read darker,
// so the pale band fades the edge out instead.
const HALO_LIGHT = "#f1f3ff";
const HALO_MID = "#b9befb";
const HALO_DARK = "#8382b3";

// Continuous heat ramp: heat = count / maxCount in [0, 1] maps smoothly from a
// pale tint to deep indigo via a light-blue midpoint.
function heatExpression(maxCount: number) {
  const range = Math.max(1, maxCount);
  return [
    "interpolate",
    ["linear"],
    ["/", ["get", "count"], range],
    0,
    HEAT_LIGHT,
    0.5,
    HEAT_MID,
    1,
    HEAT_DARK,
  ];
}

function haloHeatExpression(maxCount: number) {
  const range = Math.max(1, maxCount);
  return [
    "interpolate",
    ["linear"],
    ["/", ["get", "count"], range],
    0,
    HALO_LIGHT,
    0.5,
    HALO_MID,
    1,
    HALO_DARK,
  ];
}

// Highlight paint: features whose ancestor chain contains the hovered family
// keep their heat coloring while everything else dims.
function highlightPaints(highlight: string | null, maxCount: number) {
  const match = highlight ? ["in", `|${highlight}|`, ["get", "ancestors"]] : null;
  const heat = heatExpression(maxCount);
  const haloHeat = haloHeatExpression(maxCount);
  return {
    fillColor: match ? (["case", match, heat, DIM_FILL] as unknown[]) : heat,
    fillOpacity: match ? (["case", match, 0.85, 0.12] as unknown[]) : 0.7,
    lineColor: match ? (["case", match, haloHeat, DIM_FILL] as unknown[]) : haloHeat,
    lineOpacity: match ? (["case", match, 0.3, 0.05] as unknown[]) : 0.3,
  };
}

function applyGeometry(
  map: maplibregl.Map,
  geometry: FeatureCollection | null,
  onMaxCount: (maxCount: number) => void,
) {
  try {
    const data = geometry ? normalizeGeometry(geometry) : EMPTY_FC;
    if (geometry) fitToGeometry(map, data);
    const rewound = rewind(data, { reverse: true }) as FeatureCollection;

    let maxCount = 1;
    for (const feature of rewound.features) {
      const raw = Number((feature.properties as { count?: unknown })?.count);
      if (Number.isFinite(raw) && raw > maxCount) maxCount = Math.round(raw);
    }
    onMaxCount(maxCount);
    const source = map.getSource(GEOMETRY_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(rewound);
      // Refresh the ramp to match the new payload's scale.
      map.setPaintProperty(FILL_LAYER_ID, "fill-color", heatExpression(maxCount) as never);
      map.setPaintProperty(HALO_LAYER_ID, "line-color", haloHeatExpression(maxCount) as never);
      return;
    }
    map.addSource(GEOMETRY_SOURCE, { type: "geojson", data: rewound });
    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: GEOMETRY_SOURCE,
      paint: {
        "fill-color": heatExpression(maxCount) as never,
        "fill-opacity": 0.7,
        "fill-antialias": true,
      },
    });
    // A blurred, lighter-than-fill stroke just outside the boundary: the pale
    // gradient band makes the polygon look like it tapers out at its edges
    // instead of ending in a hard (or darker) border.
    map.addLayer({
      id: HALO_LAYER_ID,
      type: "line",
      source: GEOMETRY_SOURCE,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": haloHeatExpression(maxCount) as never,
        "line-width": 14,
        "line-blur": 10,
        "line-opacity": 0.3,
      },
    });
  } catch (error) {
    console.error("Failed to apply geometry:", error);
    toast("Couldn't render the map data.", "error");
  }
}

function applyHighlight(map: maplibregl.Map, highlight: string | null, maxCount: number) {
  const paints = highlightPaints(highlight, maxCount);
  map.setPaintProperty(FILL_LAYER_ID, "fill-color", paints.fillColor as never);
  map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", paints.fillOpacity as never);
  map.setPaintProperty(HALO_LAYER_ID, "line-color", paints.lineColor as never);
  map.setPaintProperty(HALO_LAYER_ID, "line-opacity", paints.lineOpacity as never);
}

const MapGeometryContext = createContext<(geometry: FeatureCollection | null) => void>(() => {});

export interface MapHighlight {
  highlight: string | null;
  setHighlight: (code: string | null) => void;
}

const HighlightContext = createContext<MapHighlight>({ highlight: null, setHighlight: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const useMapGeometry = () => useContext(MapGeometryContext);

// eslint-disable-next-line react-refresh/only-export-components
export const useMapHighlight = () => useContext(HighlightContext);

export { MapGeometryContext, HighlightContext };

export default function Map({ geometry }: { geometry: FeatureCollection | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const geometryRef = useRef<FeatureCollection | null>(null);
  const mapErrorShownRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const hoveredFamilyRef = useRef<string | null>(null);
  const maxCountRef = useRef(1);
  const { highlight, setHighlight } = useMapHighlight();
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;
  const location = useLocation();

  const isWordPage = location.pathname.startsWith("/words/");
  const mapCenter = useMemo<[number, number]>(
    () => (isWordPage ? [15, 54] : [10, 40]),
    [isWordPage],
  );
  const mapZoom = useMemo(() => (isWordPage ? 4 : 1.1), [isWordPage]);
  const defaultView = useMemo(() => ({ center: mapCenter, zoom: mapZoom }), [mapCenter, mapZoom]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: mapCenter,
      zoom: mapZoom,
    });
    maplibregl.config.MAX_PARALLEL_IMAGE_REQUESTS = 4;
    mapRef.current = map;
    mapLoadedRef.current = false;
    mapErrorShownRef.current = false;
    map.on("error", (e) => {
      console.error("Map error:", e.error);
      if (!mapErrorShownRef.current) {
        mapErrorShownRef.current = true;
        toast("The map couldn't load some content.", "error");
      }
    });
    map.on("load", () => {
      for (const layer of map.getStyle().layers ?? []) {
        if (
          layer.type === "symbol" ||
          /boundary|admin|road|rail|aeroway|tunnel|bridge|housenumber/i.test(layer.id)
        ) {
          map.removeLayer(layer.id);
        }
      }
      mapLoadedRef.current = true;

      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false });

      map.on("mousemove", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER_ID] });
        map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
        if (features.length === 0) {
          if (hoveredIdRef.current !== null || hoveredFamilyRef.current !== null) {
            hoveredIdRef.current = null;
            hoveredFamilyRef.current = null;
            popupRef.current?.remove();
            setHighlight(null);
          }
          return;
        }
        const props = features[0].properties as NormalizedProps;
        if (props.id !== hoveredIdRef.current) {
          hoveredIdRef.current = props.id;
          popupRef.current?.setLngLat(e.lngLat).setHTML(renderPopup(props)).addTo(map);
        }
        // Hovering a region links it to the family chart.
        const family = props.familyCode || null;
        if (family !== hoveredFamilyRef.current) {
          hoveredFamilyRef.current = family;
          setHighlight(family);
        }
      });

      applyGeometry(map, geometryRef.current, (maxCount) => {
        maxCountRef.current = maxCount;
      });
      if (highlightRef.current) {
        applyHighlight(map, highlightRef.current, maxCountRef.current);
      }
    });
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      hoveredIdRef.current = null;
      hoveredFamilyRef.current = null;
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    geometryRef.current = geometry;
    if (!mapRef.current || !mapLoadedRef.current) return;
    applyGeometry(mapRef.current, geometry, (maxCount) => {
      maxCountRef.current = maxCount;
      applyHighlight(mapRef.current!, highlightRef.current ?? null, maxCount);
    });
    if (!geometry && !isWordPage) {
      mapRef.current.easeTo({ center: defaultView.center, zoom: defaultView.zoom, duration: 1500 });
    }
  }, [geometry, defaultView, isWordPage]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    if (!geometryRef.current) return;
    applyHighlight(map, highlight, maxCountRef.current);
  }, [highlight]);

  return (
    <div
      ref={containerRef}
      className="map-container h-full rounded-2xl flex-1 border border-zinc-200"
    />
  );
}
