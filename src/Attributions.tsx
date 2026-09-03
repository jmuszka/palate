import { useNavigate } from "react-router-dom";
import { useSEO } from "./seo";
import attributions from "./content/attributions.json";

interface Source {
  name: string;
  href: string;
  what: string;
  usage: string;
  forkText?: string;
  forkHref?: string;
}

const sources: Source[] = attributions.sources;

export default function Attributions() {
  const navigate = useNavigate();

  useSEO({
    title: "Attributions - EtymoMap",
    path: "/attributions",
    description: "The data sources that power EtymoMap, from Wiktionary to Glottolog.",
  });

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
      <h2 className="text-zinc-900 text-2xl font-semibold">{attributions.heading}</h2>
      <p className="text-zinc-500 text-sm">{attributions.intro}</p>
      <ul className="flex flex-col gap-4">
        {sources.map((source) => (
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
