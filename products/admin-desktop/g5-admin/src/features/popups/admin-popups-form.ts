import { z } from "zod";
import type { AdminPopup } from "../../types/AdminPopup";
import type { AdminPopupCreateInput } from "../../types/AdminPopupCreateInput";
import type { AdminPopupUpdateInput } from "../../types/AdminPopupUpdateInput";

export const popupDivisionOptions = [
  { label: "both", value: "both" },
  { label: "comm", value: "comm" },
  { label: "shop", value: "shop" },
  { label: "layer", value: "layer" },
  { label: "new", value: "new" },
] as const;

export const popupDeviceOptions = [
  { label: "both", value: "both" },
  { label: "pc", value: "pc" },
  { label: "mobile", value: "mobile" },
] as const;

const optionalNonNegativeInteger = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^\d+$/.test(value),
    "0 이상의 정수만 입력해 주세요.",
  );

export const popupFormSchema = z.object({
  nw_begin_time: z.string().trim(),
  nw_content: z.string().trim().min(1, "본문을 입력해 주세요."),
  nw_content_html: z.boolean(),
  nw_device: z.enum(["both", "pc", "mobile"]),
  nw_disable_hours: optionalNonNegativeInteger,
  nw_division: z.enum(["both", "comm", "shop", "layer", "new"]),
  nw_end_time: z.string().trim(),
  nw_height: optionalNonNegativeInteger,
  nw_left: optionalNonNegativeInteger,
  nw_subject: z.string().trim().min(1, "팝업 제목을 입력해 주세요."),
  nw_top: optionalNonNegativeInteger,
  nw_width: optionalNonNegativeInteger,
});

export type PopupFormValues = z.infer<typeof popupFormSchema>;
type PopupDivisionValue = (typeof popupDivisionOptions)[number]["value"];
type PopupDeviceValue = (typeof popupDeviceOptions)[number]["value"];

const popupTextFields = [
  "nw_begin_time",
  "nw_end_time",
  "nw_subject",
  "nw_content",
] as const;

export function emptyPopupFormValues(): PopupFormValues {
  return {
    nw_begin_time: "",
    nw_content: "",
    nw_content_html: false,
    nw_device: "both",
    nw_disable_hours: "24",
    nw_division: "both",
    nw_end_time: "",
    nw_height: "400",
    nw_left: "100",
    nw_subject: "",
    nw_top: "100",
    nw_width: "600",
  };
}

export function toPopupFormValues(
  popup: AdminPopup | null | undefined,
): PopupFormValues {
  if (!popup) {
    return emptyPopupFormValues();
  }

  return {
    nw_begin_time: popup.nw_begin_time ?? "",
    nw_content: popup.nw_content ?? "",
    nw_content_html: (popup.nw_content_html ?? 0) === 1,
    nw_device: normalizePopupDevice(popup.nw_device ?? "") ?? "both",
    nw_disable_hours: stringifyOptionalNumber(popup.nw_disable_hours),
    nw_division: normalizePopupDivision(popup.nw_division ?? "") ?? "both",
    nw_end_time: popup.nw_end_time ?? "",
    nw_height: stringifyOptionalNumber(popup.nw_height),
    nw_left: stringifyOptionalNumber(popup.nw_left),
    nw_subject: popup.nw_subject ?? "",
    nw_top: stringifyOptionalNumber(popup.nw_top),
    nw_width: stringifyOptionalNumber(popup.nw_width),
  };
}

export function buildPopupCreateInput(
  values: PopupFormValues,
): AdminPopupCreateInput | null {
  const division = normalizePopupDivision(values.nw_division);
  const device = normalizePopupDevice(values.nw_device);
  const disableHours = parseOptionalNonNegativeInteger(values.nw_disable_hours);
  const left = parseOptionalNonNegativeInteger(values.nw_left);
  const top = parseOptionalNonNegativeInteger(values.nw_top);
  const height = parseOptionalNonNegativeInteger(values.nw_height);
  const width = parseOptionalNonNegativeInteger(values.nw_width);
  const subject = values.nw_subject.trim();
  const content = values.nw_content.trim();

  if (
    division === null ||
    device === null ||
    disableHours === undefined ||
    left === undefined ||
    top === undefined ||
    height === undefined ||
    width === undefined ||
    subject.length === 0 ||
    content.length === 0
  ) {
    return null;
  }

  return {
    nw_begin_time: normalizeOptionalText(values.nw_begin_time),
    nw_content: content,
    nw_content_html: values.nw_content_html ? 1 : 0,
    nw_device: device,
    nw_disable_hours: disableHours,
    nw_division: division,
    nw_end_time: normalizeOptionalText(values.nw_end_time),
    nw_height: height,
    nw_left: left,
    nw_subject: subject,
    nw_top: top,
    nw_width: width,
  };
}

export function buildPopupUpdateInput(
  popup: AdminPopup,
  values: PopupFormValues,
): AdminPopupUpdateInput | null {
  const division = normalizePopupDivision(values.nw_division);
  const device = normalizePopupDevice(values.nw_device);
  const disableHours = parseOptionalNonNegativeInteger(values.nw_disable_hours);
  const left = parseOptionalNonNegativeInteger(values.nw_left);
  const top = parseOptionalNonNegativeInteger(values.nw_top);
  const height = parseOptionalNonNegativeInteger(values.nw_height);
  const width = parseOptionalNonNegativeInteger(values.nw_width);

  if (
    division === null ||
    device === null ||
    disableHours === undefined ||
    left === undefined ||
    top === undefined ||
    height === undefined ||
    width === undefined
  ) {
    return null;
  }

  const input: AdminPopupUpdateInput = {
    nw_begin_time: null,
    nw_content: null,
    nw_content_html: null,
    nw_device: null,
    nw_disable_hours: null,
    nw_division: null,
    nw_end_time: null,
    nw_height: null,
    nw_id: popup.nw_id,
    nw_left: null,
    nw_subject: null,
    nw_top: null,
    nw_width: null,
  };

  let changed = false;

  for (const field of popupTextFields) {
    const currentValue = (popup[field] ?? "").trim();
    const nextValue = values[field].trim();
    if (currentValue !== nextValue) {
      input[field] = nextValue;
      changed = true;
    }
  }

  if ((popup.nw_division ?? "") !== division) {
    input.nw_division = division;
    changed = true;
  }

  if ((popup.nw_device ?? "") !== device) {
    input.nw_device = device;
    changed = true;
  }

  if ((popup.nw_disable_hours ?? null) !== disableHours) {
    input.nw_disable_hours = disableHours;
    changed = true;
  }

  if ((popup.nw_left ?? null) !== left) {
    input.nw_left = left;
    changed = true;
  }

  if ((popup.nw_top ?? null) !== top) {
    input.nw_top = top;
    changed = true;
  }

  if ((popup.nw_height ?? null) !== height) {
    input.nw_height = height;
    changed = true;
  }

  if ((popup.nw_width ?? null) !== width) {
    input.nw_width = width;
    changed = true;
  }

  const currentHtml = (popup.nw_content_html ?? 0) === 1 ? 1 : 0;
  const nextHtml = values.nw_content_html ? 1 : 0;
  if (currentHtml !== nextHtml) {
    input.nw_content_html = nextHtml;
    changed = true;
  }

  return changed ? input : null;
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePopupDivision(value: string): PopupDivisionValue | null {
  const normalized = value.trim().toLowerCase();
  return popupDivisionOptions.some((option) => option.value === normalized)
    ? (normalized as PopupDivisionValue)
    : null;
}

function normalizePopupDevice(value: string): PopupDeviceValue | null {
  const normalized = value.trim().toLowerCase();
  return popupDeviceOptions.some((option) => option.value === normalized)
    ? (normalized as PopupDeviceValue)
    : null;
}

function parseOptionalNonNegativeInteger(
  value: string,
): number | null | undefined {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function stringifyOptionalNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}
