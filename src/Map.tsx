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
const BORDER_LAYER_ID = `${GEOMETRY_SOURCE}-feathered-border`;
const ROUTES_SOURCE = "etymology-routes";
const ROUTE_LINE_ID = `${ROUTES_SOURCE}-line`;
const ROUTE_ARROWS_ID = `${ROUTES_SOURCE}-arrows`;
const ROUTE_CHEVRON = "route-chevron";
const EMPTY_FC: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

// Travel-direction dash flow: a repeating dash pattern that slides along the
// route lines, suggesting movement from the ancestor toward the newer language.
const DASH_SEGMENT = [8, 10];
const DASH_PATTERN = Array.from({ length: 12 }, () => DASH_SEGMENT).flat();

const HEAT_LIGHT = "#e8ebff";
const HEAT_MID = "#8b93f8";
const HEAT_DARK = "#312e81";
const DIM_FILL = "#e4e4e7";
const BORDER_BASE = "#4f46e5";
const BORDER_HIGHLIGHT = "#dc2626";

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

// Highlight paint: features whose ancestor chain contains the hovered family
// keep their heat coloring while everything else dims.
function highlightPaints(highlight: string | null, maxCount: number) {
  const match = highlight ? ["in", `|${highlight}|`, ["get", "ancestors"]] : null;
  const heat = heatExpression(maxCount);
  return {
    fillColor: match ? (["case", match, heat, DIM_FILL] as unknown[]) : heat,
    fillOpacity: match ? (["case", match, 0.85, 0.12] as unknown[]) : 0.7,
    borderColor: match
      ? (["case", match, BORDER_HIGHLIGHT, BORDER_BASE] as unknown[])
      : BORDER_BASE,
    borderWidth: match ? (["case", match, 2, 12] as unknown[]) : 12,
    borderBlur: match ? (["case", match, 5, 8] as unknown[]) : 8,
    borderOpacity: match ? (["case", match, 0.9, 0.3] as unknown[]) : 0.3,
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
      },
    });
    // Feather the polygon edges with a soft blurred halo hugging the boundary.
    map.addLayer({
      id: BORDER_LAYER_ID,
      type: "line",
      source: GEOMETRY_SOURCE,
      paint: {
        "line-color": BORDER_BASE,
        "line-width": 12,
        "line-blur": 8,
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
  map.setPaintProperty(BORDER_LAYER_ID, "line-color", paints.borderColor as never);
  map.setPaintProperty(BORDER_LAYER_ID, "line-width", paints.borderWidth as never);
  map.setPaintProperty(BORDER_LAYER_ID, "line-blur", paints.borderBlur as never);
  map.setPaintProperty(BORDER_LAYER_ID, "line-opacity", paints.borderOpacity as never);
}

function ensureChevronImage(map: maplibregl.Map) {
  if (map.hasImage(ROUTE_CHEVRON)) return;
  const canvas = document.createElement("canvas");
  canvas.width = 28;
  canvas.height = 28;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Chevron pointing up; with symbol-placement "line" the icon's top faces the
  // line's direction of travel, so these point from ancestor to descendant.
  ctx.fillStyle = "#b45309";
  ctx.beginPath();
  ctx.moveTo(14, 24);
  ctx.lineTo(4, 12);
  ctx.lineTo(9, 12);
  ctx.lineTo(14, 19);
  ctx.lineTo(19, 12);
  ctx.lineTo(24, 12);
  ctx.closePath();
  ctx.fill();
  const imageData = ctx.getImageData(0, 0, 28, 28);
  map.addImage(ROUTE_CHEVRON, imageData);
}

// Geodesic route lines with a fading gradient, plus chevron markers and the
// animated dash flow that shows where a word travelled across the map.
function applyRoutes(map: maplibregl.Map, routes: FeatureCollection | null) {
  if (!routes) {
    if (map.getLayer(ROUTE_ARROWS_ID)) map.removeLayer(ROUTE_ARROWS_ID);
    if (map.getLayer(ROUTE_LINE_ID)) map.removeLayer(ROUTE_LINE_ID);
    if (map.getSource(ROUTES_SOURCE)) map.removeSource(ROUTES_SOURCE);
    return;
  }

  const existing = map.getSource(ROUTES_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(routes);
    return;
  }

  map.addSource(ROUTES_SOURCE, { type: "geojson", data: routes, lineMetrics: true });
  map.addLayer({
    id: ROUTE_LINE_ID,
    type: "line",
    source: ROUTES_SOURCE,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": [
        "interpolate",
        ["linear"],
        ["line-progress"],
        0,
        "rgba(180, 83, 9, 0.10)",
        1,
        "rgba(180, 83, 9, 0.65)",
      ],
      "line-width": 2.5,
    },
  });
  ensureChevronImage(map);
  if (map.hasImage(ROUTE_CHEVRON)) {
    map.addLayer({
      id: ROUTE_ARROWS_ID,
      type: "symbol",
      source: ROUTES_SOURCE,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 30,
        "icon-image": ROUTE_CHEVRON,
        "icon-size": 0.8,
        "icon-rotation-alignment": "map",
        "icon-ignore-placement": true,
      },
      paint: { "icon-opacity": 0.85 },
    });
  }
}

// Slide the dash pattern along the route lines for a subtle flow effect.
function startRouteFlow(map: maplibregl.Map): () => void {
  let phase = 0;
  const id = window.setInterval(() => {
    phase = (phase + 1) % DASH_PATTERN.length;
    const shifted = DASH_PATTERN.slice(phase).concat(DASH_PATTERN.slice(0, phase));
    if (map.getLayer(ROUTE_LINE_ID)) {
      map.setPaintProperty(ROUTE_LINE_ID, "line-dasharray", shifted);
    }
  }, 90);
  return () => window.clearInterval(id);
}

const MapGeometryContext = createContext<(geometry: FeatureCollection | null) => void>(() => {});

export interface MapHighlight {
  highlight: string | null;
  setHighlight: (code: string | null) => void;
}

const HighlightContext = createContext<MapHighlight>({ highlight: null, setHighlight: () => {} });

export interface MapRoutes {
  routes: FeatureCollection | null;
  setRoutes: (routes: FeatureCollection | null) => void;
}

const RoutesContext = createContext<MapRoutes>({ routes: null, setRoutes: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const useMapGeometry = () => useContext(MapGeometryContext);

// eslint-disable-next-line react-refresh/only-export-components
export const useMapHighlight = () => useContext(HighlightContext);

// eslint-disable-next-line react-refresh/only-export-components
export const useMapRoutes = () => useContext(RoutesContext);

export { MapGeometryContext, HighlightContext, RoutesContext };

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
  const routesRef = useRef<FeatureCollection | null>(null);
  const stopFlowRef = useRef<(() => void) | null>(null);
  const { routes } = useMapRoutes();
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
      routesRef.current = routesRef.current ?? null;
      if (routesRef.current) {
        applyRoutes(map, routesRef.current);
        stopFlowRef.current = startRouteFlow(map);
      }
    });
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      hoveredIdRef.current = null;
      hoveredFamilyRef.current = null;
      stopFlowRef.current?.();
      stopFlowRef.current = null;
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

  useEffect(() => {
    routesRef.current = routes;
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    stopFlowRef.current?.();
    stopFlowRef.current = null;
    applyRoutes(map, routes);
    if (routes) {
      stopFlowRef.current = startRouteFlow(map);
    }
  }, [routes]);

  return (
    <div
      ref={containerRef}
      className="map-container h-full rounded-2xl flex-1 border border-zinc-200"
    />
  );
}
