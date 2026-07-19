import { createContext, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";

const GEOMETRY_SOURCE = "etymology-geometry";
const EMPTY_FC: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function extendBounds(bounds: maplibregl.LngLatBounds, coords: unknown) {
  if (
    Array.isArray(coords) &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number"
  ) {
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

function applyGeometry(
  map: maplibregl.Map,
  geometry: FeatureCollection | null,
) {
  const data = geometry ?? EMPTY_FC;
  if (geometry) fitToGeometry(map, geometry);
  const source = map.getSource(GEOMETRY_SOURCE) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(GEOMETRY_SOURCE, { type: "geojson", data });
  map.addLayer({
    id: `${GEOMETRY_SOURCE}-fill`,
    type: "fill",
    source: GEOMETRY_SOURCE,
    paint: { "fill-color": "#6366f1", "fill-opacity": 0.15 },
  });
  map.addLayer({
    id: `${GEOMETRY_SOURCE}-line`,
    type: "line",
    source: GEOMETRY_SOURCE,
    paint: { "line-color": "#4f46e5", "line-width": 2 },
  });
  map.addLayer({
    id: `${GEOMETRY_SOURCE}-point`,
    type: "circle",
    source: GEOMETRY_SOURCE,
    paint: {
      "circle-radius": 5,
      "circle-color": "#4f46e5",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    },
  });
}

const MapGeometryContext = createContext<
  (geometry: FeatureCollection | null) => void
>(() => {});

// eslint-disable-next-line react-refresh/only-export-components
export const useMapGeometry = () => useContext(MapGeometryContext);

export { MapGeometryContext };

export default function Map({
  geometry,
}: {
  geometry: FeatureCollection | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const geometryRef = useRef<FeatureCollection | null>(null);
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
    map.on("load", () => {
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.type === "symbol" || /boundary|admin/i.test(layer.id)) {
          map.removeLayer(layer.id);
        }
      }
      mapLoadedRef.current = true;
      applyGeometry(map, geometryRef.current);
    });
    return () => {
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
      className="h-full rounded-3xl flex-1 border border-zinc-200"
    />
  );
}
