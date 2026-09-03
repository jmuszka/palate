import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import useIsMobile from "./hooks/useIsMobile";

vi.mock("./hooks/useIsMobile", () => ({ default: vi.fn() }));
const mockUseIsMobile = vi.mocked(useIsMobile);

describe("Header", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReset();
  });

  it("renders inline nav links on wide screens", () => {
    mockUseIsMobile.mockReturnValue(false);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Toggle menu" })).not.toBeInTheDocument();
  });

  it("renders a hamburger toggle on narrow screens", () => {
    mockUseIsMobile.mockReturnValue(true);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Toggle menu" })).toBeInTheDocument();
    expect(screen.queryByText("About")).not.toBeInTheDocument();
  });

  it("opens and closes the menu via the toggle", () => {
    mockUseIsMobile.mockReturnValue(true);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    fireEvent.click(toggle);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", () => {
    mockUseIsMobile.mockReturnValue(true);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu on Escape", () => {
    mockUseIsMobile.mockReturnValue(true);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const menu = screen.getByRole("menu");

    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu after selecting a link", () => {
    mockUseIsMobile.mockReturnValue(true);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "About" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
