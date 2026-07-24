export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    request_id: string | null;
  };
}

export interface HttpRequest<TBody = unknown> {
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: `/${string}`;
  body?: TBody;
  signal?: AbortSignal;
}

export interface HttpTransport {
  request<TResponse, TBody = unknown>(
    request: HttpRequest<TBody>,
  ): Promise<TResponse>;
}

export class TransportError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "TransportError";
  }
}
