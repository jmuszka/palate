import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "./Layout";
import useIsMobile from "./hooks/useIsMobile";

vi.mock("./hooks/useIsMobile", () => ({ default: vi.fn() }));
const mockUseIsMobile = vi.mocked(useIsMobile);

vi.mock("./Map", async () => {
  const React = await import("react");
  const MapGeometryContext = React.createContext<(g: unknown) => void>(() => {});
  return {
    default: () => null,
    MapGeometryContext,
    useMapGeometry: () => React.useContext(MapGeometryContext),
  };
});

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout>
        <p>page content</p>
      </Layout>
    </MemoryRouter>,
  );
}

function mockRect(el: Element, width = 1000, height = 1000) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe("Layout", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReset();
  });

  it("clamps the panel width between 25% and 50% when dragging", () => {
    mockUseIsMobile.mockReturnValue(false);

    const { container } = renderLayout();
    const root = container.firstChild as HTMLElement;
    mockRect(root);

    const panel = root.children[0] as HTMLElement;
    expect(panel.style.width).toBe("30%");

    const divider = container.querySelector(".cursor-col-resize") as HTMLElement;

    fireEvent.mouseDown(divider);
    fireEvent.mouseMove(window, { clientX: 900 });
    expect(panel.style.width).toBe("50%");

    fireEvent.mouseMove(window, { clientX: 100 });
    expect(panel.style.width).toBe("25%");

    fireEvent.mouseUp(window);
  });

  it("clamps the map height between 20% and 60% on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);

    const { container } = renderLayout();
    const root = container.firstChild as HTMLElement;
    mockRect(root);

    const mapContainer = root.children[2] as HTMLElement;
    expect(mapContainer.style.height).toBe("40%");

    const divider = root.children[3] as HTMLElement;

    fireEvent.mouseDown(divider);
    fireEvent.mouseMove(window, { clientY: 950 });
    expect(mapContainer.style.height).toBe("60%");

    fireEvent.mouseMove(window, { clientY: 50 });
    expect(mapContainer.style.height).toBe("20%");

    fireEvent.mouseUp(window);
  });
});
