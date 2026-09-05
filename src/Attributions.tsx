import { useSEO } from "./seo";
import attributions from "./content/attributions.json";
import BackButton from "./BackButton";

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
  useSEO({
    title: "Attributions - EtymoMap",
    path: "/attributions",
    description: "The data sources that power EtymoMap, from Wiktionary to Glottolog.",
  });

  return (
    <section className="flex flex-col gap-4">
      <BackButton />
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
