declare const __APP_VERSION__: string;

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";

// Lets pages (e.g. WordPage) push the etymology geometry onto the shared map.
const MapGeometryContext = createContext<
  (geometry: FeatureCollection | null) => void
>(() => {});

// eslint-disable-next-line react-refresh/only-export-components
export const useMapGeometry = () => useContext(MapGeometryContext);

const GEOMETRY_SOURCE = "etymology-geometry";
const EMPTY_FC: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

// Walk any GeoJSON coordinate array (point → multipolygon) and extend bounds.
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

// Zoom/pan the map to frame the geometry. No-op if there are no coordinates.
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

// Draw (or update) the etymology geometry on the map. Layer type is implicitly
// filtered by geometry: fill only renders polygons, circle only points, etc.
function applyGeometry(
  map: maplibregl.Map,
  geometry: FeatureCollection | null,
) {
  const data = geometry ?? EMPTY_FC;
  if (geometry) fitToGeometry(map, geometry);
  const source = map.getSource(GEOMETRY_SOURCE) as
    maplibregl.GeoJSONSource | undefined;
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

export default function Layout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const geometryRef = useRef<FeatureCollection | null>(null);
  const [geometry, setGeometry] = useState<FeatureCollection | null>(null);
  const [panelWidth, setPanelWidth] = useState(30);
  const dragging = useRef(false);
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
      // Strip modern country borders and place labels
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

  // Re-render geometry whenever it changes and the map is ready.
  useEffect(() => {
    geometryRef.current = geometry;
    if (mapRef.current && mapLoadedRef.current) {
      applyGeometry(mapRef.current, geometry);
    }
  }, [geometry]);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setPanelWidth(Math.min(Math.max(pct, 25), 50));
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="flex w-screen h-screen p-4 gap-0 bg-zinc-100">
      <div
        className="h-full flex flex-col gap-4 min-h-0"
        style={{ width: `${panelWidth}%` }}
      >
        <div className="shrink-0 rounded-3xl bg-white border border-zinc-200 px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center w-full">
            <img src="/favicon.png" alt="" className="w-11 h-11" />
            <h1 className="text-zinc-900 text-xl font-semibold">EtymoMap</h1>
          </div>
          <div className="flex justify-end gap-4 w-full">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/blog/articles">Blog</a>
            <a href="/games">Games</a>
          </div>
        </div>
        <div className="flex-1 min-h-0 rounded-3xl bg-white border border-zinc-200 px-6 pt-6 pb-2 flex flex-col gap-4 overflow-y-auto">
          <MapGeometryContext.Provider value={setGeometry}>
            {children}
          </MapGeometryContext.Provider>
          <p className="mt-auto pt-4 text-xs text-zinc-400 text-center">
            {__APP_VERSION__}
          </p>
        </div>
      </div>
      <div
        className="h-full flex items-center justify-center w-4 shrink-0 cursor-col-resize group"
        onMouseDown={onMouseDown}
      >
        <div className="w-1 h-8 rounded-full bg-zinc-300 group-hover:bg-zinc-400 transition-colors" />
      </div>
      <div
        ref={containerRef}
        className="h-full rounded-3xl flex-1 border border-zinc-200"
      />
    </div>
  );
}
