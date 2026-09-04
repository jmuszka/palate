import { useParams, useNavigate } from "react-router-dom";
import useSWR from "swr";
import Markdown from "react-markdown";
import { useSEO } from "./seo";
import { formatDate, type BlogArticle } from "./blog";

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const {
    data: article,
    isLoading,
    error,
  } = useSWR<BlogArticle>(
    slug
      ? `${import.meta.env.VITE_SERVER_URL}/api/v1/blog/articles/${encodeURIComponent(slug)}`
      : null,
  );

  useSEO({
    title: article ? `${article.title} - EtymoMap` : "Blog - EtymoMap",
    path: slug ? `/blog/articles/${encodeURIComponent(slug)}` : undefined,
    description: article?.description,
    type: "article",
  });

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
            <Markdown
              components={{
                h1: (props) => <h1 className="text-zinc-900 text-xl font-semibold" {...props} />,
                h2: (props) => <h2 className="text-zinc-900 text-lg font-semibold" {...props} />,
                h3: (props) => <h3 className="text-zinc-800 text-base font-semibold" {...props} />,
                a: (props) => <a className="text-indigo-600 hover:underline" {...props} />,
                ul: (props) => <ul className="list-disc pl-5 flex flex-col gap-1" {...props} />,
                ol: (props) => <ol className="list-decimal pl-5 flex flex-col gap-1" {...props} />,
              }}
            >
              {article.content}
            </Markdown>
          </div>
        </article>
      )}
    </>
  );
}
