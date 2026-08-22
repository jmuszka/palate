import { useEffect, useState, useDeferredValue, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";

const controller = new AbortController();
const fetcher = (url: string) =>
  fetch(url, {
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_BEARER_TOKEN}`,
    },
  }).then((res) => res.json());

export default function App() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeResults = useCallback(() => {
    setResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const goToWord = useCallback(
    (word: string) => {
      setQuery("");
      closeResults();
      navigate(`/words/${encodeURIComponent(word)}`);
    },
    [navigate, closeResults],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            e.preventDefault();
            goToWord(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeResults();
          break;
      }
    },
    [results, selectedIndex, goToWord, closeResults],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/suggestions.txt", { signal: controller.signal })
      .then((r) => r.text())
      .then((text) => {
        const words = text
          .split("\n")
          .map((w) => w.trim())
          .filter(Boolean);
        // Shuffle and take a handful, fresh on each page load
        for (let i = words.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [words[i], words[j]] = [words[j], words[i]];
        }
        setSuggestions(words.slice(0, 8));
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const { data } = useSWR(
    deferredQuery.trim()
      ? `${import.meta.env.VITE_SERVER_URL}/api/v1/words?prefix=${encodeURIComponent(deferredQuery)}`
      : null,
    fetcher,
  );

  useEffect(() => {
    if (!deferredQuery.trim()) {
      setResults([]);
      return;
    }
    if (data) setResults(data);
  }, [data, deferredQuery]);

  useEffect(() => {
    if (results.length === 0) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        closeResults();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [results.length, closeResults]);

  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-center text-center py-6">
        <h2 className="text-zinc-900 text-2xl font-semibold">Welcome to EtymoMap</h2>
        <p className="mt-1 text-zinc-500 text-sm max-w-md">
          Every word has a journey. Search any word to trace its roots, meanings, and the paths it
          travelled across the map of language.
        </p>

        <div ref={searchRef} className="relative w-full mt-5">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10.5 10.5L14 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            id="word-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search any word…"
            autoFocus
            role="combobox"
            aria-label="Search words"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={
              selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
            }
            aria-autocomplete="list"
            className="w-full rounded-full border border-zinc-300 bg-white pl-11 pr-4 py-3 text-base text-zinc-800 placeholder-zinc-400 shadow-sm outline-none focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-200 transition"
          />
          {results.length > 0 && (
            <div
              id="search-results"
              role="listbox"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeResults();
                }
              }}
              className="absolute z-10 left-0 right-0 mt-2 flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-lg overflow-hidden text-left"
            >
              {results.map((word, i) => (
                <button
                  key={word}
                  id={`search-result-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === selectedIndex}
                  onClick={() => goToWord(word)}
                  className={`px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:bg-zinc-50 transition-colors ${i === selectedIndex ? "bg-zinc-100 focus-visible:bg-zinc-100" : ""}`}
                >
                  {word}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestions.map((word) => (
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
        <h3 className="text-zinc-800 text-lg font-semibold">Explore the story behind every word</h3>
        <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
          From the viking invasions to the Norman-French conquest in 1066, and from post-Renaissance
          neologisms to its status as a global lingua franca, the English language boasts a
          fascinating history and development. Despite its origins as a West Germanic language, over
          two-thirds of the English lexicon consists of Romance vocabulary, mainly from French and
          Latin, with significant influence from Old Norse, Greek, and many others as well.
        </p>
        <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
          Open any entry to uncover a word's etymology, the languages and older forms it descended
          from, laid out alongside its International Phonetic Alphabet spelling, historical usage,
          and an interactive atlas that maps where it came from and how it spread across the world.
        </p>
      </section>

      <section className="mt-6">
        <h3 className="text-zinc-800 text-lg font-semibold">Discover more</h3>
        <p className="mt-1 text-zinc-500 text-sm">
          There's plenty more to dig into beyond the atlas.
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
              blurb: "Put your knowledge to the test with etymology games.",
            },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 hover:border-zinc-400 hover:bg-white transition-colors"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium text-zinc-800">{link.title}</span>
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
