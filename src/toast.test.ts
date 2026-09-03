import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type * as ToastModule from "./toast";

let toast: typeof ToastModule.toast;
let dismiss: typeof ToastModule.dismiss;
let useToasts: typeof ToastModule.useToasts;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./toast");
  toast = mod.toast;
  dismiss = mod.dismiss;
  useToasts = mod.useToasts;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toast store", () => {
  it("appends a toast with an incrementing id", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      toast("hello", "info");
    });

    expect(result.current).toEqual([{ id: 1, message: "hello", variant: "info" }]);
  });

  it("deduplicates identical message + variant", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      toast("dup", "error");
      toast("dup", "error");
    });

    expect(result.current).toHaveLength(1);
  });

  it("allows the same message with a different variant", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      toast("same", "error");
      toast("same", "info");
    });

    expect(result.current).toHaveLength(2);
  });

  it("auto-dismisses after 5 seconds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToasts());

    act(() => {
      toast("timed", "info");
    });
    expect(result.current).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toHaveLength(0);
  });

  it("dismiss removes a toast by id", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      toast("first", "info");
      toast("second", "info");
    });
    expect(result.current).toHaveLength(2);

    act(() => {
      dismiss(result.current[0].id);
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].message).toBe("second");
  });

  it("dismiss is a no-op for an unknown id", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      toast("keep", "info");
      dismiss(999);
    });

    expect(result.current).toHaveLength(1);
  });
});
