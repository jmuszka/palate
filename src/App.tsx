import { useEffect, useState, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";

const SUGGESTIONS = [
  "whiskey",
  "robot",
  "coffee",
  "quarantine",
  "salary",
  "avocado",
  "nightmare",
  "ketchup",
];

export default function App() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!deferredQuery.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    fetch(
      `${import.meta.env.VITE_SERVER_URL}/api/v1/words?prefix=${encodeURIComponent(deferredQuery)}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {});
    return () => controller.abort();
  }, [deferredQuery]);

  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-center text-center py-6">
        <h2 className="text-zinc-900 text-2xl font-semibold">
          Welcome to EtymoMap
        </h2>
        <p className="mt-1 text-zinc-500 text-sm max-w-md">
          Every word has a journey. Search any word to trace its roots,
          meanings, and the paths it travelled across the map of language.
        </p>

        <div className="relative w-full mt-5">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="7"
              cy="7"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M10.5 10.5L14 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            id="word-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any word…"
            autoFocus
            className="w-full rounded-full border border-zinc-300 bg-white pl-11 pr-4 py-3 text-base text-zinc-800 placeholder-zinc-400 shadow-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition"
          />
          {results.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-2 flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-lg overflow-hidden text-left">
              {results.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => navigate(`/words/${encodeURIComponent(word)}`)}
                  className="px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {word}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => navigate(`/words/${encodeURIComponent(word)}`)}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
            >
              {word}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-2 border-t border-zinc-100 pt-6 flex flex-col gap-2">
        <h3 className="text-zinc-800 text-lg font-semibold">
          Explore the story behind every word
        </h3>
        <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
          From the viking invasions to the Norman-French conquest in 1066, and
          from post-Renaissance neologisms to its status as a global lingua
          franca, the English language boasts a fascinating history and
          development. Despite its origins as a West Germanic language, over
          two-thirds of the English lexicon consists of Romance vocabulary,
          mainly from French and Latin, with significant influence from Old
          Norse, Greek, and many others as well.
        </p>
        <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
          Open any entry to uncover a word's etymology — the languages and older
          forms it descended from — laid out alongside its IPA pronunciation,
          historical usage, and an interactive map that charts where it came
          from and how it spread across the world.
        </p>
      </section>

      <section className="mt-6">
        <h3 className="text-zinc-800 text-lg font-semibold">Discover more</h3>
        <p className="mt-1 text-zinc-500 text-sm">
          There's plenty more to dig into beyond the dictionary.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {[
            {
              href: "/about",
              title: "About the project",
              blurb: "Why EtymoMap exists and the data that powers it.",
            },
            {
              href: "/blog/articles",
              title: "Blog",
              blurb: "Deep dives, word stories, and language curiosities.",
            },
            {
              href: "/games",
              title: "Games",
              blurb: "Put your instincts to the test with etymology games.",
            },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 hover:border-zinc-400 hover:bg-white transition-colors"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium text-zinc-800">
                  {link.title}
                </span>
                <span className="text-xs text-zinc-500">{link.blurb}</span>
              </span>
              <svg
                className="text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 3L11 8L6 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
