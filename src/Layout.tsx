import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import Header from "./Header";
import ContentPanel from "./ContentPanel";
import Map from "./Map";
import useIsMobile from "./hooks/useIsMobile";
import type { FeatureCollection } from "geojson";

export default function Layout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [geometry, setGeometry] = useState<FeatureCollection | null>(null);
  const [panelWidth, setPanelWidth] = useState(30);
  const [mapHeightPct, setMapHeightPct] = useState(40);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  const startDrag = useCallback(
    (direction: "horizontal" | "vertical") =>
      (_e: React.MouseEvent | React.TouchEvent) => {
        dragging.current = true;
        document.body.style.cursor =
          direction === "horizontal" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
        document.body.style.touchAction = "none";
      },
    [],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      if (isMobileRef.current) {
        const pct = ((e.clientY - rect.top) / rect.height) * 100;
        setMapHeightPct(Math.min(Math.max(pct, 20), 60));
      } else {
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        setPanelWidth(Math.min(Math.max(pct, 25), 50));
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      if (isMobileRef.current) {
        const pct = ((touch.clientY - rect.top) / rect.height) * 100;
        setMapHeightPct(Math.min(Math.max(pct, 20), 60));
      } else {
        const pct = ((touch.clientX - rect.left) / rect.width) * 100;
        setPanelWidth(Math.min(Math.max(pct, 25), 50));
      }
    };
    const onEnd = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col w-screen h-dvh p-2 bg-zinc-100"
      >
        <Header />
        <div
          className="flex items-center justify-center h-2 shrink-0 cursor-row-resize group touch-none"
        >
        </div>
        <div
          className="shrink-0 rounded-3xl overflow-hidden border border-zinc-200"
          style={{ height: `${mapHeightPct}%` }}
        >
          <Map geometry={geometry} />
        </div>
        <div
          className="flex items-center justify-center h-4 shrink-0 cursor-row-resize group touch-none"
          onMouseDown={startDrag("vertical")}
          onTouchStart={startDrag("vertical")}
        >
          <div className="w-8 h-1 rounded-full bg-zinc-300 group-hover:bg-zinc-400 transition-colors" />
        </div>
        <div className="flex-1 min-h-0">
          <ContentPanel setGeometry={setGeometry}>{children}</ContentPanel>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex w-screen h-dvh p-4 gap-0 bg-zinc-100"
    >
      <div
        className="h-full flex flex-col gap-4 min-h-0"
        style={{ width: `${panelWidth}%` }}
      >
        <Header />
        <ContentPanel setGeometry={setGeometry}>{children}</ContentPanel>
      </div>
      <div
        className="h-full flex items-center justify-center w-4 shrink-0 cursor-col-resize group touch-none"
        onMouseDown={startDrag("horizontal")}
        onTouchStart={startDrag("horizontal")}
      >
        <div className="w-1 h-8 rounded-full bg-zinc-300 group-hover:bg-zinc-400 transition-colors" />
      </div>
      <Map geometry={geometry} />
    </div>
  );
}
