import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BlogArticlePage from "./BlogArticlePage";

const { useSWRMock, navigateMock } = vi.hoisted(() => ({
  useSWRMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => ({ slug: "hello" }),
    useNavigate: () => navigateMock,
  };
});

function mockSWR(response: unknown) {
  useSWRMock.mockImplementation((key: unknown) => {
    if (typeof key !== "string") return {};
    if (key.includes("/api/v1/blog/articles/hello")) return response;
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

const article = {
  slug: "hello",
  title: "Hello",
  description: "A greeting",
  content: "# Heading\n\nSome **markdown** body.",
  published: "2026-08-22 22:23:02",
  modified: "2026-08-23 10:00:00",
};

describe("BlogArticlePage", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    useSWRMock.mockReset();
    navigateMock.mockReset();
  });

  it("shows a loading state", () => {
    mockSWR({ data: undefined, isLoading: true });

    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders the article title, dates, and markdown body", () => {
    mockSWR({ data: article, isLoading: false });

    renderPage();

    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText(/Published/)).toBeInTheDocument();
    expect(screen.getByText(/Modified/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByText(/markdown/)).toBeInTheDocument();
  });

  it("shows an error state", () => {
    mockSWR({ data: undefined, isLoading: false, error: new Error("nope") });

    renderPage();
    expect(
      screen.getByText("We couldn't load this article. Please try again."),
    ).toBeInTheDocument();
  });
});
