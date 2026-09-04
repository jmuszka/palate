import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BlogArticlePage from "./BlogArticlePage";

const { useSWRMock, navigateMock, mapGeometrySetterMock } = vi.hoisted(() => ({
  useSWRMock: vi.fn(),
  navigateMock: vi.fn(),
  mapGeometrySetterMock: vi.fn(),
}));

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  unobserve() {}
  disconnect() {}

  trigger(target: Element) {
    this.callback(
      [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("./Map", () => ({ useMapGeometry: () => mapGeometrySetterMock }));
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => ({ slug: "hello" }),
    useNavigate: () => navigateMock,
  };
});

const article = {
  slug: "hello",
  title: "Hello",
  description: "A greeting",
  content: "Intro\n\n{/api/v1/words/hello/etymology}\n\nOutro",
  published: "2026-08-22 22:23:02",
  modified: "2026-08-23 10:00:00",
};

function mockSWR(articleResponse: unknown, geoResponse?: unknown) {
  useSWRMock.mockImplementation((key: unknown) => {
    if (typeof key !== "string") return {};
    if (key.includes("/api/v1/blog/articles/hello")) return articleResponse;
    if (key.includes("/api/v1/words/hello/etymology")) return geoResponse ?? {};
    return {};
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BlogArticlePage />
    </MemoryRouter>,
  );
}

describe("BlogArticlePage", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    useSWRMock.mockReset();
    navigateMock.mockReset();
    mapGeometrySetterMock.mockReset();
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state", () => {
    mockSWR({ data: undefined, isLoading: true });

    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders the article title, dates, and markdown body", () => {
    mockSWR({
      data: { ...article, content: "# Heading\n\nSome **markdown** body." },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText(/Published/)).toBeInTheDocument();
    expect(screen.getByText(/Modified/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByText(/markdown/)).toBeInTheDocument();
  });

  it("renders the marker as visible text", () => {
    mockSWR({ data: article, isLoading: false });

    renderPage();
    expect(screen.getByText("{/api/v1/words/hello/etymology}")).toBeInTheDocument();
  });

  it("fetches the marker endpoint and renders its geojson when it crosses the threshold", () => {
    const geojson = { type: "FeatureCollection", features: [] };
    mockSWR({ data: article, isLoading: false }, { data: { geojson }, isLoading: false });

    renderPage();

    const instance = MockIntersectionObserver.instances[0];
    expect(instance.observed).toHaveLength(1);

    act(() => {
      instance.trigger(instance.observed[0]);
    });

    expect(mapGeometrySetterMock).toHaveBeenCalledWith(geojson);
  });

  it("prefetches every marker endpoint in parallel on load", () => {
    const twoMarkerArticle = {
      ...article,
      content: "A {/api/v1/geography/England} B {/api/v1/geography/France}",
    };
    useSWRMock.mockImplementation((key: unknown) => {
      if (typeof key !== "string") return {};
      if (key.includes("/api/v1/blog/articles/hello")) {
        return { data: twoMarkerArticle, isLoading: false };
      }
      return {};
    });

    renderPage();

    const keys = useSWRMock.mock.calls
      .map((call) => call[0])
      .filter((k): k is string => typeof k === "string");
    expect(keys.some((k) => k.includes("/api/v1/geography/England"))).toBe(true);
    expect(keys.some((k) => k.includes("/api/v1/geography/France"))).toBe(true);
  });

  it("shows an error state", () => {
    mockSWR({ data: undefined, isLoading: false, error: new Error("nope") });

    renderPage();
    expect(
      screen.getByText("We couldn't load this article. Please try again."),
    ).toBeInTheDocument();
  });
});
