import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BlogPage from "./BlogPage";

const { useSWRMock, navigateMock } = vi.hoisted(() => ({
  useSWRMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function mockSWR(response: unknown) {
  useSWRMock.mockImplementation((key: unknown) => {
    if (typeof key !== "string") return {};
    if (key.includes("/api/v1/blog/articles")) return response;
    return {};
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BlogPage />
    </MemoryRouter>,
  );
}

describe("BlogPage", () => {
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

  it("shows an empty state when there are no articles", () => {
    mockSWR({ data: { articles: [] }, isLoading: false });

    renderPage();
    expect(screen.getByText("No articles yet. Check back soon.")).toBeInTheDocument();
  });

  it("renders a list of article links with title, description, and date", () => {
    mockSWR({
      data: {
        articles: [
          {
            slug: "hello",
            title: "Hello",
            description: "A greeting",
            published: "2026-08-22 22:23:02",
            modified: "2026-08-22 22:23:02",
          },
        ],
      },
      isLoading: false,
    });

    renderPage();

    const link = screen.getByRole("link", { name: /Hello/ });
    expect(link).toHaveAttribute("href", "/blog/articles/hello");
    expect(screen.getByText("A greeting")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    mockSWR({ data: undefined, isLoading: false, error: new Error("nope") });

    renderPage();
    expect(
      screen.getByText("We couldn't load the articles. Please try again."),
    ).toBeInTheDocument();
  });
});
