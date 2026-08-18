import type { AdminPopup, AdminPopupCreate, AdminPopupUpdate } from "../../api/fleet";

export const popupDivisionOptions = ["both", "comm", "shop", "layer", "new"] as const;
export const popupDeviceOptions = ["both", "pc", "mobile"] as const;

export interface AdminPopupFormDraft {
  nw_division: (typeof popupDivisionOptions)[number];
  nw_device: (typeof popupDeviceOptions)[number];
  nw_begin_time: string;
  nw_end_time: string;
  nw_disable_hours: string;
  nw_left: string;
  nw_top: string;
  nw_height: string;
  nw_width: string;
  nw_subject: string;
  nw_content: string;
  nw_content_html: boolean;
}

export const emptyAdminPopupForm: AdminPopupFormDraft = {
  nw_division: "both",
  nw_device: "both",
  nw_begin_time: "",
  nw_end_time: "",
  nw_disable_hours: "24",
  nw_left: "100",
  nw_top: "100",
  nw_height: "400",
  nw_width: "600",
  nw_subject: "",
  nw_content: "",
  nw_content_html: false,
};

const numberFields = ["nw_disable_hours", "nw_left", "nw_top", "nw_height", "nw_width"] as const;

export function popupDraft(popup: AdminPopup): AdminPopupFormDraft {
  return {
    nw_division: popupDivisionOptions.includes(popup.nw_division as never) ? popup.nw_division as AdminPopupFormDraft["nw_division"] : "both",
    nw_device: popupDeviceOptions.includes(popup.nw_device as never) ? popup.nw_device as AdminPopupFormDraft["nw_device"] : "both",
    nw_begin_time: popup.nw_begin_time ?? "",
    nw_end_time: popup.nw_end_time ?? "",
    nw_disable_hours: stringify(popup.nw_disable_hours),
    nw_left: stringify(popup.nw_left),
    nw_top: stringify(popup.nw_top),
    nw_height: stringify(popup.nw_height),
    nw_width: stringify(popup.nw_width),
    nw_subject: popup.nw_subject ?? "",
    nw_content: popup.nw_content ?? "",
    nw_content_html: popup.nw_content_html === 1,
  };
}

export function buildAdminPopupCreate(draft: AdminPopupFormDraft): AdminPopupCreate | null {
  const subject = draft.nw_subject.trim();
  const content = draft.nw_content.trim();
  const numbers = parseNumbers(draft);
  if (!subject || !content || !numbers) return null;
  return {
    nw_division: draft.nw_division,
    nw_device: draft.nw_device,
    ...(draft.nw_begin_time.trim() ? { nw_begin_time: draft.nw_begin_time.trim() } : {}),
    ...(draft.nw_end_time.trim() ? { nw_end_time: draft.nw_end_time.trim() } : {}),
    ...numbers,
    nw_subject: subject,
    nw_content: content,
    nw_content_html: draft.nw_content_html ? 1 : 0,
  };
}

export function buildAdminPopupUpdate(popup: AdminPopup, draft: AdminPopupFormDraft): AdminPopupUpdate | null {
  const next = buildAdminPopupCreate(draft);
  if (!next) return null;
  const current = buildAdminPopupCreate(popupDraft(popup));
  if (!current) return next;
  const update: AdminPopupUpdate = {};
  for (const key of Object.keys(next) as (keyof AdminPopupCreate)[]) {
    if (next[key] !== current[key]) Object.assign(update, { [key]: next[key] });
  }
  for (const key of ["nw_begin_time", "nw_end_time"] as const) {
    if (!(key in next) && key in current) update[key] = "";
  }
  return Object.keys(update).length ? update : null;
}

function parseNumbers(draft: AdminPopupFormDraft): Pick<AdminPopupCreate, (typeof numberFields)[number]> | null {
  const parsed: Record<string, number> = {};
  for (const field of numberFields) {
    const value = Number(draft[field]);
    if (!Number.isSafeInteger(value) || value < 0) return null;
    parsed[field] = value;
  }
  return parsed as Pick<AdminPopupCreate, (typeof numberFields)[number]>;
}

function stringify(value: number | null): string {
  return value === null ? "" : String(value);
}
