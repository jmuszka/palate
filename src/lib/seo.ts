import { useEffect } from "react";

export const SITE_NAME = "EtymoMap";
export const HOME_TITLE = "EtymoMap";
export const SITE_DESCRIPTION =
  "EtymoMap is a historical geolinguistic atlas for visualizing the evolution of natural language over time and space. Search any word to trace its etymology, language family, and geographic journey.";

const ENV_SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").trim().replace(/\/+$/, "");

export function siteUrl(path = "/"): string {
  const origin = ENV_SITE_URL || window.location.origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface SEOInput {
  title: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
  image?: string;
  jsonLd?: object;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSEO({
  title,
  description = SITE_DESCRIPTION,
  path,
  type = "website",
  image,
  jsonLd,
}: SEOInput) {
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : undefined;

  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);

    if (path) {
      const url = siteUrl(path);
      setLink("canonical", url);
      setMeta("property", "og:url", url);
    }

    if (image) {
      const url = siteUrl(image);
      setMeta("property", "og:image", url);
      setMeta("name", "twitter:image", url);
    }

    if (jsonLdString) {
      let script = document.head.querySelector<HTMLScriptElement>("script[data-seo='jsonld']");
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.seo = "jsonld";
        document.head.appendChild(script);
      }
      script.textContent = jsonLdString;
    }

    return () => {
      document.title = SITE_NAME;
    };
  }, [title, description, path, type, image, jsonLdString]);
}
