import { afterEach, describe, expect, it, vi } from "vitest";
import { fetcher, ApiError } from "./fetcher";

describe("ApiError", () => {
  it("is an Error carrying name, status, and message", () => {
    const error = new ApiError(404, "not found");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(404);
    expect(error.message).toBe("not found");
  });
});

describe("fetcher", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends an Authorization header and merges custom headers", async () => {
    vi.stubEnv("VITE_BEARER_TOKEN", "secret");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hello: "world" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetcher("/api", { headers: { "X-Custom": "1" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api");
    expect(init.headers).toEqual({ Authorization: "Bearer secret", "X-Custom": "1" });
  });

  it("resolves with parsed JSON on success", async () => {
    vi.stubEnv("VITE_BEARER_TOKEN", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) }));

    await expect(fetcher("/api")).resolves.toEqual({ a: 1 });
  });

  it("throws ApiError using body.message on a non-ok response", async () => {
    vi.stubEnv("VITE_BEARER_TOKEN", "secret");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: async () => ({ message: "boom" }) }),
    );

    const error = (await fetcher("/api").catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
    expect(error.message).toBe("boom");
  });

  it("falls back to body.error when message is absent", async () => {
    vi.stubEnv("VITE_BEARER_TOKEN", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "bad" }) }),
    );

    const error = (await fetcher("/api").catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe("bad");
  });

  it("keeps a generic message when the body is not JSON", async () => {
    vi.stubEnv("VITE_BEARER_TOKEN", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    const error = (await fetcher("/api").catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(503);
    expect(error.message).toBe("Request failed (503)");
  });
});
