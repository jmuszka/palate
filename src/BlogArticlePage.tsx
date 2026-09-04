import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useSWR from "swr";
import Markdown from "react-markdown";
import type { FeatureCollection } from "geojson";
import { useSEO } from "./seo";
import { useMapGeometry } from "./Map";
import { formatDate, type BlogArticle } from "./blog";
import { parseContent } from "./geoMarkers";

const mdComponents = {
  h1: (props: object) => <h1 className="text-zinc-900 text-xl font-semibold" {...props} />,
  h2: (props: object) => <h2 className="text-zinc-900 text-lg font-semibold" {...props} />,
  h3: (props: object) => <h3 className="text-zinc-800 text-base font-semibold" {...props} />,
  a: (props: object) => <a className="text-indigo-600 hover:underline" {...props} />,
  ul: (props: object) => <ul className="list-disc pl-5 flex flex-col gap-1" {...props} />,
  ol: (props: object) => <ol className="list-decimal pl-5 flex flex-col gap-1" {...props} />,
};

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const setGeometry = useMapGeometry();
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const markerRefs = useRef(new Map<number, HTMLSpanElement>());

  const {
    data: article,
    isLoading,
    error,
  } = useSWR<BlogArticle>(
    slug
      ? `${import.meta.env.VITE_SERVER_URL}/api/v1/blog/articles/${encodeURIComponent(slug)}`
      : null,
  );

  const segments = useMemo(() => (article ? parseContent(article.content) : []), [article]);

  const { data: geoData } = useSWR<{ geojson: FeatureCollection }>(
    activeEndpoint ? `${import.meta.env.VITE_SERVER_URL}${activeEndpoint}` : null,
    { keepPreviousData: true },
  );

  useSEO({
    title: article ? `${article.title} - EtymoMap` : "Blog - EtymoMap",
    path: slug ? `/blog/articles/${encodeURIComponent(slug)}` : undefined,
    description: article?.description,
    type: "article",
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const endpoint = (entry.target as HTMLElement).dataset.geoEndpoint;
          if (endpoint) setActiveEndpoint(endpoint);
        }
      },
      { rootMargin: "0px 0px -75% 0px", threshold: 0 },
    );
    for (const el of markerRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [segments]);

  useEffect(() => {
    setGeometry(geoData?.geojson ?? null);
    return () => setGeometry(null);
  }, [geoData, setGeometry]);

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("/blog/articles")}
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

      {isLoading && <p className="text-zinc-500 text-sm">Loading…</p>}
      {error && !isLoading && (
        <p className="text-red-400 text-sm">We couldn't load this article. Please try again.</p>
      )}
      {article && !isLoading && (
        <article className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-zinc-900 text-2xl font-semibold">{article.title}</h1>
            <div className="flex flex-col gap-0.5 text-xs text-zinc-400">
              <span>Published {formatDate(article.published)}</span>
              <span>Modified {formatDate(article.modified)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-zinc-600 text-sm leading-relaxed">
            {segments.map((segment, i) =>
              segment.type === "marker" ? (
                <span
                  key={i}
                  data-geo-endpoint={segment.endpoint}
                  ref={(el) => {
                    if (el) markerRefs.current.set(i, el);
                    else markerRefs.current.delete(i);
                  }}
                >
                  {`{${segment.endpoint}}`}
                </span>
              ) : (
                <Markdown key={i} components={mdComponents}>
                  {segment.value}
                </Markdown>
              ),
            )}
          </div>
        </article>
      )}
    </>
  );
}
