import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

const STATIC_ROUTES = [
  "/",
  "/about",
  "/blog/articles",
  "/games",
  "/attributions",
  "/feedback",
  "/changelog",
];

function generateSeoFiles(siteUrl: string) {
  return {
    name: "generate-seo-files",
    closeBundle() {
      if (!siteUrl) return;
      const dist = resolve(process.cwd(), "dist");
      mkdirSync(dist, { recursive: true });

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...STATIC_ROUTES.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`),
        "</urlset>",
        "",
      ].join("\n");

      const robots = ["User-agent: *", "Allow: /", "", `Sitemap: ${siteUrl}/sitemap.xml`, ""].join(
        "\n",
      );

      writeFileSync(resolve(dist, "sitemap.xml"), sitemap);
      writeFileSync(resolve(dist, "robots.txt"), robots);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL ?? "").trim().replace(/\/+$/, "");

  return {
    plugins: [react(), tailwindcss(), generateSeoFiles(siteUrl)],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      coverage: {
        reporter: ["text", "html"],
      },
    },
  };
});
