import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeedbackPage from "./FeedbackPage";

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

describe("FeedbackPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.unstubAllGlobals();
  });

  function fillAndSubmit(message = "hello world") {
    const textarea = screen.getByPlaceholderText("Share your thoughts…");
    fireEvent.change(textarea, { target: { value: message } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  }

  it("renders the form with category choices", () => {
    render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Send feedback")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Suggestion/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Bug report/ })).toBeInTheDocument();
  });

  it("shows the success screen when submission succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }));

    render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>,
    );

    fillAndSubmit();
    expect(await screen.findByText("Thank you!")).toBeInTheDocument();
  });

  it("shows the server error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ json: async () => ({ success: false, message: "Server said no" }) }),
    );

    render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>,
    );

    fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Server said no");
  });

  it("shows a fallback message when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>,
    );

    fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the submission service.",
    );
  });
});
