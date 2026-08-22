import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import EtymologyTree, { type EtymologyData } from "./EtymologyTree";
import FamilyPieChart from "./FamilyPieChart";
import { useMapGeometry } from "./Map";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_BEARER_TOKEN}`,
    },
  }).then((res) => res.json());

export default function WordPage() {
  const { word } = useParams<{ word: string }>();
  const navigate = useNavigate();
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
  } = useSWR<EtymologyData>(base ? `${base}/etymology${suffix}` : null, fetcher);
  const { data: ipaData } = useSWR<{ ipa?: string }>(base ? `${base}/ipa${suffix}` : null, fetcher);
  const { data: historyData } = useSWR<{ history?: string }>(
    base ? `${base}/history${suffix}` : null,
    fetcher,
  );

  const ipa = ipaData?.ipa ?? null;
  const history = historyData?.history ?? null;

  useEffect(() => {
    if (word) document.title = `${word} - EtymoMap`;
    return () => {
      document.title = "EtymoMap";
    };
  }, [word]);

  useEffect(() => {
    setMapGeometry(etymology?.geojson ?? null);
    return () => setMapGeometry(null);
  }, [etymology, setMapGeometry]);

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors w-fit"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 3L5 8L10 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </button>
      <div className="flex items-baseline gap-3">
        <h1 className="text-zinc-900 text-2xl font-semibold">{word}</h1>
        {ipa && <span className="text-zinc-400 text-sm">{ipa}</span>}
      </div>
      {loading && <p className="text-zinc-400 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      {etymology !== undefined && !loading && (
        <>
          <EtymologyTree data={etymology} />
          <FamilyPieChart families={etymology.family} />
        </>
      )}
      {history && <p className="text-zinc-600 text-sm">{history}</p>}
    </>
  );
}
