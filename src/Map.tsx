import { createContext, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature } from "geojson";
import rewind from "@turf/rewind";
import { toast } from "./toast";

const GEOMETRY_SOURCE = "etymology-geometry";
const FILL_LAYER_ID = `${GEOMETRY_SOURCE}-fill`;
const BORDER_LAYER_ID = `${GEOMETRY_SOURCE}-feathered-border`;
const EMPTY_FC: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

interface RegionProperties {
  id?: string;
  name?: string;
  count?: number;
}

interface NormalizedProps {
  id: string;
  name: string;
  count: number;
  heat: number;
}

function normalizeGeometry(geometry: FeatureCollection): FeatureCollection {
  const seen = new Set<string>();
  const entries: { feature: Feature; id: string; name: string; count: number }[] = [];
  let maxCount = 1;

  for (const feature of geometry.features) {
    const raw = (feature.properties ?? {}) as RegionProperties;
    const id = raw.id ?? raw.name;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const name = raw.name ?? id;
    const countValue = Number(raw.count);
    const count = Number.isFinite(countValue) && countValue > 0 ? Math.round(countValue) : 1;
    if (count > maxCount) maxCount = count;

    entries.push({ feature, id, name, count });
  }

  const features = entries.map(({ feature, id, name, count }) => ({
    ...feature,
    properties: { id, name, count, heat: count / maxCount },
  }));

  return { type: "FeatureCollection", features } as FeatureCollection;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPopup(props: NormalizedProps): string {
  return `<div style="display:flex;flex-direction:column;gap:2px;">
    <span style="font-size:13px;font-weight:600;color:#18181b;">${escapeHtml(props.name)}</span>
    <span style="font-size:11px;color:#71717a;">weight ${props.count}</span>
  </div>`;
}

function extendBounds(bounds: maplibregl.LngLatBounds, coords: unknown) {
  if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
    bounds.extend(coords as [number, number]);
    return;
  }
  if (Array.isArray(coords)) {
    for (const child of coords) extendBounds(bounds, child);
  }
}

function fitToGeometry(map: maplibregl.Map, geometry: FeatureCollection) {
  const bounds = new maplibregl.LngLatBounds();
  for (const feature of geometry.features) {
    if (feature.geometry && "coordinates" in feature.geometry) {
      extendBounds(bounds, feature.geometry.coordinates);
    }
  }
  if (bounds.isEmpty()) return;
  map.fitBounds(bounds, { padding: 60, maxZoom: 8, animate: false });
}

function applyGeometry(map: maplibregl.Map, geometry: FeatureCollection | null) {
  try {
    const data = geometry ? normalizeGeometry(geometry) : EMPTY_FC;
    if (geometry) fitToGeometry(map, data);
    const rewound = rewind(data, { reverse: true });
    const source = map.getSource(GEOMETRY_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(rewound);
      return;
    }
    map.addSource(GEOMETRY_SOURCE, { type: "geojson", data: rewound });
    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: GEOMETRY_SOURCE,
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "heat"],
          0,
          "#c7d2fe",
          0.5,
          "#6366f1",
          1,
          "#4338ca",
        ],
        "fill-opacity": 0.6,
      },
    });
    map.addLayer({
      id: BORDER_LAYER_ID,
      type: "line",
      source: GEOMETRY_SOURCE,
      paint: {
        "line-color": "#4f46e5",
        "line-width": 2,
        "line-blur": 100,
        "line-opacity": 0.35,
      },
    });
  } catch (error) {
    console.error("Failed to apply geometry:", error);
    toast("Couldn't render the map data.", "error");
  }
}

const MapGeometryContext = createContext<(geometry: FeatureCollection | null) => void>(() => {});

// eslint-disable-next-line react-refresh/only-export-components
export const useMapGeometry = () => useContext(MapGeometryContext);

export { MapGeometryContext };

export default function Map({ geometry }: { geometry: FeatureCollection | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const geometryRef = useRef<FeatureCollection | null>(null);
  const mapErrorShownRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const location = useLocation();

  const isWordPage = location.pathname.startsWith("/words/");
  const mapCenter: [number, number] = isWordPage ? [15, 54] : [0, 20];
  const mapZoom = isWordPage ? 4 : 2;

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
        if (layer.type === "symbol" || /boundary|admin/i.test(layer.id)) {
          map.removeLayer(layer.id);
        }
      }
      mapLoadedRef.current = true;

      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false });

      map.on("mousemove", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER_ID] });
        map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
        if (features.length === 0) {
          if (hoveredIdRef.current !== null) {
            hoveredIdRef.current = null;
            popupRef.current?.remove();
          }
          return;
        }
        const props = features[0].properties as NormalizedProps;
        if (props.id === hoveredIdRef.current) return;
        hoveredIdRef.current = props.id;
        popupRef.current?.setLngLat(e.lngLat).setHTML(renderPopup(props)).addTo(map);
      });

      applyGeometry(map, geometryRef.current);
    });
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      hoveredIdRef.current = null;
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    geometryRef.current = geometry;
    if (mapRef.current && mapLoadedRef.current) {
      applyGeometry(mapRef.current, geometry);
    }
  }, [geometry]);

  return (
    <div
      ref={containerRef}
      className="map-container h-full rounded-3xl flex-1 border border-zinc-200"
    />
  );
}
