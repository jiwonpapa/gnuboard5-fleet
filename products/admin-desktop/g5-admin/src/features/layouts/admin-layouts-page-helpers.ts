import type { QueryClient } from "@tanstack/react-query";
import type { CommandError } from "../../api/client";
import type { AdminLayoutDetailResponse } from "../../types/AdminLayoutDetailResponse";

export type LayoutDraft = {
  reorderWidgetIds: string;
  title: string;
  widgetsJson: string;
};

export function buildDraftFromLayout(layout: {
  sl_page_id: string;
  sl_schema: string | null;
  sl_title: string | null;
}): LayoutDraft {
  return {
    reorderWidgetIds: extractWidgetIds(layout.sl_schema ?? null).join("\n"),
    title: layout.sl_title ?? layout.sl_page_id,
    widgetsJson: stringifyWidgetsFromSchema(layout.sl_schema ?? null),
  };
}

export function parseWidgetList(schemaJson: string | null) {
  if (!schemaJson) {
    return [] as Array<Record<string, unknown>>;
  }

  try {
    const parsed = JSON.parse(schemaJson) as { widgets?: Array<Record<string, unknown>> };
    return Array.isArray(parsed.widgets) ? parsed.widgets : [];
  } catch {
    return [];
  }
}

export function parseWidgetsJson(widgetsJson: string) {
  try {
    const parsed = JSON.parse(widgetsJson) as Array<Record<string, unknown>>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyWidgetsFromSchema(schemaJson: string | null) {
  return JSON.stringify(parseWidgetList(schemaJson), null, 2);
}

export function extractWidgetIds(schemaJson: string | null) {
  return parseWidgetList(schemaJson)
    .map((widget) => widget.widget_id)
    .filter((widgetId): widgetId is string => typeof widgetId === "string" && widgetId.length > 0);
}

export function nextWidgetOrder(schemaJson: string | null) {
  const orders = parseWidgetList(schemaJson)
    .map((widget) => widget.order)
    .filter((order): order is number => typeof order === "number");

  return orders.length === 0 ? 1 : Math.max(...orders) + 1;
}

export function normalizeOptionalInteger(value: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function invalidateLayoutQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ["admin", "layouts"] });
}

export function syncLayoutDetail(
  queryClient: QueryClient,
  response: AdminLayoutDetailResponse,
) {
  queryClient.setQueryData(["admin", "layouts", "detail", response.layout.sl_page_id], response);
}

export function pickLayoutCommandError(
  ...errors: Array<CommandError | Error | null | undefined>
) {
  return (
    errors.find(
      (error): error is CommandError =>
        error !== null &&
        error !== undefined &&
        typeof error === "object" &&
        "request_id" in error &&
        "code" in error,
    ) ?? null
  );
}
