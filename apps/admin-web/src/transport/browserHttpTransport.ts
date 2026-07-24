import {
  type ErrorEnvelope,
  type HttpRequest,
  type HttpTransport,
  TransportError,
} from "./contracts";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class BrowserHttpTransport implements HttpTransport {
  constructor(
    private readonly basePath = "",
    private readonly fetcher?: FetchLike,
    private readonly browserOrigin = globalThis.location?.origin ??
      "http://localhost",
  ) {}

  async request<TResponse, TBody = unknown>(
    request: HttpRequest<TBody>,
  ): Promise<TResponse> {
    const endpoint = this.endpoint(request.path);
    const headers = new Headers({ accept: "application/json" });
    if (request.body !== undefined) {
      headers.set("content-type", "application/json");
    }
    if (request.csrfToken) {
      headers.set("x-csrf-token", request.csrfToken);
    }
    const fetcher = this.fetcher ?? globalThis.fetch.bind(globalThis);
    const response = await fetcher(endpoint, {
      method: request.method,
      headers,
      body: request.body === undefined
        ? undefined
        : JSON.stringify(request.body),
      credentials: "same-origin",
      redirect: "error",
      signal: request.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) {
      const envelope = isErrorEnvelope(payload) ? payload : undefined;
      throw new TransportError(
        response.status,
        envelope?.error.code ?? "http_error",
        envelope?.error.message ?? `Fleet request failed (${response.status}).`,
        envelope?.error.request_id ?? null,
      );
    }
    return payload as TResponse;
  }

  private endpoint(path: `/${string}`): URL {
    if (path.startsWith("//") || this.basePath.includes("://")) {
      throw new TransportError(
        0,
        "cross_origin_forbidden",
        "Fleet Web may only call its same-origin server.",
        null,
      );
    }
    const endpoint = new URL(`${this.basePath}${path}`, this.browserOrigin);
    if (endpoint.origin !== this.browserOrigin) {
      throw new TransportError(
        0,
        "cross_origin_forbidden",
        "Fleet Web may only call its same-origin server.",
        null,
      );
    }
    return endpoint;
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new TransportError(
      response.status,
      "invalid_json",
      "Fleet server returned an invalid JSON response.",
      null,
    );
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const error = value.error;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}
