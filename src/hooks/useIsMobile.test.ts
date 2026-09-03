import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useIsMobile from "./useIsMobile";

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

describe("useIsMobile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when the width is within the breakpoint", () => {
    setWidth(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when the width exceeds the breakpoint", () => {
    setWidth(1000);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("honors a custom breakpoint", () => {
    setWidth(900);
    const { result } = renderHook(() => useIsMobile(1440));
    expect(result.current).toBe(true);
  });

  it("updates on resize", () => {
    setWidth(1000);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWidth(400);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe(true);
  });

  it("removes the resize listener on unmount", () => {
    setWidth(1000);
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useIsMobile());

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
