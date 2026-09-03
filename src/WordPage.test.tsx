import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WordPage from "./WordPage";

const { useSWRMock, navigateMock, mapGeometrySetterMock } = vi.hoisted(() => ({
  useSWRMock: vi.fn(),
  navigateMock: vi.fn(),
  mapGeometrySetterMock: vi.fn(),
}));

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("./Map", () => ({ useMapGeometry: () => mapGeometrySetterMock }));
vi.mock("./EtymologyTree", () => ({
  default: () => <div data-testid="etymology-tree" />,
}));
vi.mock("./FamilySunburst", () => ({
  default: () => <div data-testid="family-sunburst" />,
}));
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => ({ word: "test" }),
    useNavigate: () => navigateMock,
    useSearchParams: () => [{ toString: () => "" }],
  };
});

const etymologyData = {
  graph: [],
  familyTree: { id: "root", name: "root", value: 1, children: [] },
  geojson: { type: "FeatureCollection", features: [] },
  ipa: "/tɛst/",
};

function mockSWR(etymology: unknown, history: unknown) {
  useSWRMock.mockImplementation((key: unknown) => {
    if (typeof key !== "string") return {};
    if (key.includes("/etymology")) return etymology;
    if (key.includes("/history")) return history;
    return {};
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WordPage />
    </MemoryRouter>,
  );
}

describe("WordPage", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    useSWRMock.mockReset();
    navigateMock.mockReset();
    mapGeometrySetterMock.mockReset();
  });

  it("shows a loading state", () => {
    mockSWR({ data: undefined, isLoading: true }, { data: undefined });

    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    mockSWR({ data: undefined, isLoading: false, error: new Error("nope") }, { data: undefined });

    renderPage();
    expect(screen.getByText("We couldn't load this word. Please try again.")).toBeInTheDocument();
  });

  it("renders the tree and sunburst when data is loaded", () => {
    mockSWR({ data: etymologyData, isLoading: false }, { data: undefined });

    renderPage();

    expect(screen.getByRole("heading", { name: "test" })).toBeInTheDocument();
    expect(screen.getByText("/tɛst/")).toBeInTheDocument();
    expect(screen.getByTestId("etymology-tree")).toBeInTheDocument();
    expect(screen.getByTestId("family-sunburst")).toBeInTheDocument();
  });

  it("truncates the SEO description from a long history", () => {
    const longHistory = "a".repeat(200);
    mockSWR({ data: etymologyData, isLoading: false }, { data: { history: longHistory } });

    renderPage();

    const expected = `${longHistory.slice(0, 155)}…`;
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      expected,
    );
  });

  it("builds a fallback description when there is no history", () => {
    mockSWR({ data: etymologyData, isLoading: false }, { data: undefined });

    renderPage();

    const content = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(content).toContain('"test"');
  });
});
