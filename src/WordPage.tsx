import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import EtymologyTree, { type EtymologyData } from "./EtymologyTree";
import BackButton from "./BackButton";
import FamilySunburst from "./FamilySunburst";
import { useMapGeometry } from "./Map";
import useSWR from "swr";
import { useSEO, siteUrl } from "./seo";

export default function WordPage() {
  const { word } = useParams<{ word: string }>();
  const [searchParams] = useSearchParams();
  const setMapGeometry = useMapGeometry();

  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";
  const base = word
    ? `${import.meta.env.VITE_SERVER_URL}/api/v1/words/${encodeURIComponent(word)}`
    : null;

  const {
    data: etymology,
    isLoading: loading,
    error,
  } = useSWR<EtymologyData>(base ? `${base}/etymology${suffix}` : null);
  const { data: historyData } = useSWR<{ history?: string }>(
    base ? `${base}/history${suffix}` : null,
  );

  const history = historyData?.history ?? null;

  const description = history
    ? history.length > 155
      ? `${history.slice(0, 155)}…`
      : history
    : word
      ? `Explore the etymology, language family, and geographic journey of "${word}" on EtymoMap.`
      : undefined;

  useSEO({
    title: word ? `${word} - EtymoMap` : "EtymoMap",
    description,
    path: word ? `/words/${encodeURIComponent(word)}` : undefined,
    type: "article",
    jsonLd: word
      ? {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${word} - EtymoMap`,
          url: siteUrl(`/words/${encodeURIComponent(word)}`),
          isPartOf: { "@type": "WebSite", name: "EtymoMap", url: siteUrl("/") },
        }
      : undefined,
  });

  useEffect(() => {
    setMapGeometry(etymology?.geojson ?? null);
    return () => setMapGeometry(null);
  }, [etymology, setMapGeometry]);

  return (
    <>
      <BackButton />
      <div className="flex items-baseline gap-3">
        <h1 className="text-zinc-900 text-2xl font-semibold">{word}</h1>
        {etymology?.ipa && <span className="text-zinc-500 text-sm">{etymology.ipa}</span>}
      </div>
      {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
      {error && !loading && (
        <p className="text-red-400 text-sm">We couldn't load this word. Please try again.</p>
      )}
      {etymology !== undefined && !loading && (
        <>
          <EtymologyTree data={etymology} />
          <FamilySunburst familyTree={etymology.familyTree} />
        </>
      )}
      {history && <p className="text-zinc-600 text-sm">{history}</p>}
    </>
  );
}
