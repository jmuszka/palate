import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SOURCES = [
  {
    name: "Wiktionary",
    href: "https://en.wiktionary.org",
    what: "A crowdsourced multilingual dictionary maintained by the Wikimedia Foundation. Each entry captures a word's definitions, pronunciations, translations, and, critically for EtymoMap, its etymological lineage. Wiktionary allows us to see which ancestors a word descends from and which sibling share that ancestry.",
    usage:
      "Provides every word in the database along with the structured etymological relationships between them. Data was extracted using a custom fork of",
    forkText: "etymology-db",
    forkHref: "https://github.com/droher/etymology-db",
  },
  {
    name: "Etymonline",
    href: "https://www.etymonline.com",
    what: "An online etymology dictionary launched in the early 2000s that gives informal, narrative-style accounts of how English words came to be. Rather than a rigid tree, it tells the story: what a word originally meant, how its sense shifted over centuries, and which historical events or cultural forces nudged it along.",
    usage:
      "Supplies the prose etymologies displayed alongside the relationship tree, giving each word a readable backstory that complements the structured graph data.",
  },
  {
    name: "Glottolog",
    href: "https://glottolog.org",
    what: "A bibliographic database of the world\u2019s languages run by the Max Planck Institute for Evolutionary Anthropology in Leipzig. It assigns every known language a unique identifier (\u201Cglottocode\u201D), classifies them into a genealogical family tree, and tracks the published literature documenting each one.",
    usage:
      "Provides the language family hierarchy so EtymoMap knows, for example, that English belongs to the West Germanic branch of Indo-European. This powers the family pie chart and the language classification shown on each word page.",
  },
  {
    name: "Glottography",
    href: "https://glottography.org",
    what: "A spatial dataset linked to Glottolog that maps each glottocode to geographic regions. For every language it records both where it is spoken natively today and its historical area of origin.",
    usage:
      "Supplies the GeoJSON polygon data that draws language regions on the map — the shaded areas and origin points you see when viewing a word's journey.",
  },
  {
    name: "CARTO Positron",
    href: "https://carto.com/basemaps",
    what: "A free vector basemap style by CARTO that uses a muted palette of light grays and creams, designed to sit quietly behind data overlays without competing for visual attention.",
    usage:
      "The tile layer underneath all map content, providing roads, coastlines, and place labels without distracting from the etymology data rendered on top.",
  },
];

export default function Attributions() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Attributions - EtymoMap";
    return () => {
      document.title = "EtymoMap";
    };
  }, []);

  return (
    <section className="flex flex-col gap-4">
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
      <h2 className="text-zinc-900 text-2xl font-semibold">Attributions</h2>
      <p className="text-zinc-500 text-sm">EtymoMap is built on data from these sources:</p>
      <ul className="flex flex-col gap-4">
        {SOURCES.map((source) => (
          <li
            key={source.name}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 flex flex-col gap-2"
          >
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-800 hover:text-zinc-600 transition-colors"
            >
              {source.name}
            </a>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{source.what}</p>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
              {source.usage}
              {source.forkText && (
                <>
                  {" "}
                  <a
                    href={source.forkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-zinc-700 transition-colors"
                  >
                    {source.forkText}
                  </a>
                </>
              )}
              .
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
