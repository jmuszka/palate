export interface BlogArticleSummary {
  slug: string;
  title: string;
  description: string;
  published: string;
  modified: string;
}

export interface BlogArticle extends BlogArticleSummary {
  content: string;
}

export interface ArticlesResponse {
  articles: BlogArticleSummary[];
}

export function formatDate(value: string): string {
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
