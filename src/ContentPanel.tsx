declare const __APP_VERSION__: string;

import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { MapGeometryContext } from "./Map";
import type { FeatureCollection } from "geojson";

export default function ContentPanel({
  children,
  setGeometry,
}: {
  children: ReactNode;
  setGeometry: (geometry: FeatureCollection | null) => void;
}) {
  return (
    <div
      data-scroll-container
      className="h-full rounded-3xl bg-white border border-zinc-200 px-6 pt-6 pb-2 flex flex-col gap-4 overflow-y-auto"
    >
      <MapGeometryContext.Provider value={setGeometry}>{children}</MapGeometryContext.Provider>
      <div className="mt-auto pt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
        <Link to="/changelog" className="hover:text-indigo-600 transition-colors underline">
          {__APP_VERSION__}
        </Link>
        <span>·</span>
        <Link to="/attributions" className="hover:text-indigo-600 transition-colors underline">
          Attributions
        </Link>
      </div>
    </div>
  );
}
