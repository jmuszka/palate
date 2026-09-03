import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

const { useSWRMock, navigateMock, toastMock } = vi.hoisted(() => ({
  useSWRMock: vi.fn(),
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("swr", () => ({ default: useSWRMock }));
vi.mock("./toast", () => ({ toast: toastMock }));
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

describe("App", () => {
  beforeEach(() => {
    useSWRMock.mockReset();
    navigateMock.mockReset();
    toastMock.mockReset();
    useSWRMock.mockReturnValue({});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => "alpha\nbeta\ngamma\n" }),
    );
  });

  it("renders the welcome heading and discover links", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("Welcome to EtymoMap")).toBeInTheDocument();
    expect(screen.getByText("About the project")).toBeInTheDocument();

    await screen.findByRole("button", { name: "alpha" });
  });

  it("loads and renders word suggestions", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "beta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "gamma" })).toBeInTheDocument();
  });

  it("toasts when suggestions fail to load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith("Couldn't load word suggestions.", "error");
    });
    errorSpy.mockRestore();
  });

  it("supports arrow-key navigation and Enter to select a result", async () => {
    useSWRMock.mockReturnValue({ data: ["apple", "banana"] });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "ap" } });

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(navigateMock).toHaveBeenCalledWith("/words/banana");
  });

  it("clears results on Escape", async () => {
    useSWRMock.mockReturnValue({ data: ["apple", "banana"] });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "ap" } });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
