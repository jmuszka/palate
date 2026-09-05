import { Link } from "react-router-dom";
import useSWR from "swr";
import { useSEO } from "./seo";
import { formatDate, type ArticlesResponse } from "./blog";
import BackButton from "./BackButton";

export default function BlogPage() {
  useSEO({
    title: "Blog - EtymoMap",
    path: "/blog/articles",
    description: "Read articles about language, etymology, and the stories behind words.",
  });

  const { data, isLoading, error } = useSWR<ArticlesResponse>(
    `${import.meta.env.VITE_SERVER_URL}/api/v1/blog/articles`,
  );

  const articles = data?.articles ?? [];

  return (
    <>
      <BackButton />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-zinc-900 text-2xl font-semibold">Blog</h2>
          <p className="text-zinc-500 text-sm">
            Articles about language, etymology, and the stories behind words.
          </p>
        </div>

        {isLoading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {error && !isLoading && (
          <p className="text-red-400 text-sm">We couldn't load the articles. Please try again.</p>
        )}
        {!isLoading && !error && articles.length === 0 && (
          <p className="text-zinc-500 text-sm">No articles yet. Check back soon.</p>
        )}
        {!isLoading && !error && articles.length > 0 && (
          <div className="flex flex-col gap-2">
            {articles.map((article) => (
              <Link
                key={article.slug}
                to={`/blog/articles/${encodeURIComponent(article.slug)}`}
                className="group flex flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 hover:border-zinc-400 hover:bg-white transition-colors"
              >
                <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">
                  {article.title}
                </span>
                <span className="text-xs text-zinc-500">{article.description}</span>
                <span className="text-xs text-zinc-400">{formatDate(article.published)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
