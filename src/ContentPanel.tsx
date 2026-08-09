declare const __APP_VERSION__: string;

import { type ReactNode } from "react";
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
    <div className="h-full rounded-3xl bg-white border border-zinc-200 px-6 pt-6 pb-2 flex flex-col gap-4 overflow-y-auto">
      <MapGeometryContext.Provider value={setGeometry}>{children}</MapGeometryContext.Provider>
      <div className="mt-auto pt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
        <span>{__APP_VERSION__}</span>
        <span>·</span>
        <a href="/attributions" className="hover:text-zinc-600 transition-colors">
          Attributions
        </a>
      </div>
    </div>
  );
}
