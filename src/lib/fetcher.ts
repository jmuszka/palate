export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetcher<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_BEARER_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: unknown; error?: unknown };
      if (typeof body?.message === "string") message = body.message;
      else if (typeof body?.error === "string") message = body.error;
    } catch {
      // Response body was not JSON; keep the generic message.
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}
