declare const __APP_VERSION__: string;

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function Layout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
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
      maxParallelImageRequests: 4,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
          {children}
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
