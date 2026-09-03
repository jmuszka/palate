import { createContext, useContext, useEffect, useRef } from "react";
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
const EMPTY_FC: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

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
          ["get", "count"],
          0,
          "#eef2ff",
          1,
          "#c7d2fe",
          3,
          "#818cf8",
          5,
          "#6366f1",
          7,
          "#4f46e5",
          10,
          "#312e81",
        ],
        "fill-opacity": 0.7,
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
