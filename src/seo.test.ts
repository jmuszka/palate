import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { siteUrl, useSEO, SITE_NAME, SITE_DESCRIPTION } from "./seo";

describe("siteUrl", () => {
  it("uses the window origin when VITE_SITE_URL is empty", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_SITE_URL", "");
    const mod = await import("./seo");

    expect(mod.siteUrl("/")).toBe(`${window.location.origin}/`);
    expect(mod.siteUrl("/about")).toBe(`${window.location.origin}/about`);
    expect(mod.siteUrl("about")).toBe(`${window.location.origin}/about`);
  });

  it("uses the env origin and strips trailing slashes", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_SITE_URL", "https://example.com/");
    const mod = await import("./seo");

    expect(mod.siteUrl("/about")).toBe("https://example.com/about");
  });
});

describe("useSEO", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets the title and core meta tags", () => {
    renderHook(() => useSEO({ title: "Test", description: "Desc", path: "/test" }));

    expect(document.title).toBe("Test");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Desc",
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(
      "Test",
    );
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe(
      "website",
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      siteUrl("/test"),
    );
  });

  it("defaults the description to SITE_DESCRIPTION", () => {
    renderHook(() => useSEO({ title: "Test" }));
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      SITE_DESCRIPTION,
    );
  });

  it("sets image and JSON-LD meta when provided", () => {
    renderHook(() => useSEO({ title: "Test", image: "/hero.png", jsonLd: { "@type": "WebSite" } }));

    expect(document.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(
      siteUrl("/hero.png"),
    );
    const script = document.querySelector('script[data-seo="jsonld"]');
    expect(script).not.toBeNull();
    expect(script?.textContent).toBe(JSON.stringify({ "@type": "WebSite" }));
  });

  it("resets the title to SITE_NAME on unmount", () => {
    const { unmount } = renderHook(() => useSEO({ title: "Test" }));
    expect(document.title).toBe("Test");

    unmount();
    expect(document.title).toBe(SITE_NAME);
  });
});
