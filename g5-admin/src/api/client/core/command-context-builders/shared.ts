export type CommandPayload = Record<string, unknown> | undefined;

export type CommandContextTemplate = {
  area: string;
  localTarget?: string;
  operation: string;
};

export type CommandContextBuilder = (
  payload?: CommandPayload
) => CommandContextTemplate;

export function stringFromPayload(
  payload: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function stringFromRecord(
  value: unknown,
  key: string
): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const field = record[key];
  return typeof field === "string" && field.length > 0 ? field : undefined;
}

export function numberFromPayload(
  payload: Record<string, unknown> | undefined,
  key: string
): number | undefined {
  const value = payload?.[key];
  return typeof value === "number" ? value : undefined;
}

export function numberFromRecord(
  value: unknown,
  key: string
): number | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const field = record[key];
  return typeof field === "number" ? field : undefined;
}

export function composeCompositeTarget(
  value: unknown,
  keys: string[]
): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const parts = keys
    .map((key) => record[key])
    .filter(
      (field): field is string => typeof field === "string" && field.length > 0
    );

  return parts.length > 0 ? parts.join(" / ") : undefined;
}
