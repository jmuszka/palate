import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ToastProvider from "./Toast";
import { toast } from "./toast";

describe("ToastProvider", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <p>child content</p>
      </ToastProvider>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("shows toasts and dismisses them on click", () => {
    render(
      <ToastProvider>
        <p>child content</p>
      </ToastProvider>,
    );

    act(() => {
      toast("first", "info");
      toast("second", "error");
    });

    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByText("second")).toBeInTheDocument();
    expect(screen.queryByText("first")).not.toBeInTheDocument();
  });
});
