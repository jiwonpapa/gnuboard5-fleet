import { z } from "zod";
import type { AdminPoll } from "../../types/AdminPoll";
import type { AdminPollCreateInput } from "../../types/AdminPollCreateInput";
import type { AdminPollUpdateInput } from "../../types/AdminPollUpdateInput";

const optionalNonNegativeInteger = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^\d+$/.test(value),
    "0 이상의 정수만 입력해 주세요.",
  );

export const pollFormSchema = z.object({
  po_etc: z.string().trim(),
  po_date: z.string().trim(),
  po_level: optionalNonNegativeInteger,
  po_point: optionalNonNegativeInteger,
  po_poll1: z.string().trim().min(1, "항목 1은 필수입니다."),
  po_poll2: z.string().trim().min(1, "항목 2는 필수입니다."),
  po_poll3: z.string().trim(),
  po_poll4: z.string().trim(),
  po_poll5: z.string().trim(),
  po_poll6: z.string().trim(),
  po_poll7: z.string().trim(),
  po_poll8: z.string().trim(),
  po_poll9: z.string().trim(),
  po_subject: z.string().trim().min(1, "투표 제목을 입력해 주세요."),
  po_use: z.boolean(),
});

export type PollFormValues = z.infer<typeof pollFormSchema>;

export const pollTextFields = [
  "po_subject",
  "po_poll1",
  "po_poll2",
  "po_poll3",
  "po_poll4",
  "po_poll5",
  "po_poll6",
  "po_poll7",
  "po_poll8",
  "po_poll9",
  "po_etc",
] as const;

export function emptyPollFormValues(): PollFormValues {
  return {
    po_etc: "",
    po_date: "",
    po_level: "1",
    po_point: "0",
    po_poll1: "",
    po_poll2: "",
    po_poll3: "",
    po_poll4: "",
    po_poll5: "",
    po_poll6: "",
    po_poll7: "",
    po_poll8: "",
    po_poll9: "",
    po_subject: "",
    po_use: true,
  };
}

export function toPollFormValues(poll: AdminPoll | null | undefined): PollFormValues {
  if (!poll) {
    return emptyPollFormValues();
  }

  return {
    po_etc: poll.po_etc ?? "",
    po_date: poll.po_date ?? "",
    po_level: stringifyOptionalNumber(poll.po_level),
    po_point: stringifyOptionalNumber(poll.po_point),
    po_poll1: poll.po_poll1 ?? "",
    po_poll2: poll.po_poll2 ?? "",
    po_poll3: poll.po_poll3 ?? "",
    po_poll4: poll.po_poll4 ?? "",
    po_poll5: poll.po_poll5 ?? "",
    po_poll6: poll.po_poll6 ?? "",
    po_poll7: poll.po_poll7 ?? "",
    po_poll8: poll.po_poll8 ?? "",
    po_poll9: poll.po_poll9 ?? "",
    po_subject: poll.po_subject ?? "",
    po_use: (poll.po_use ?? 0) === 1,
  };
}

export function buildPollCreateInput(
  values: PollFormValues,
): AdminPollCreateInput | null {
  const poSubject = values.po_subject.trim();
  const poPoll1 = values.po_poll1.trim();
  const poPoll2 = values.po_poll2.trim();
  const poLevel = parseOptionalNonNegativeInteger(values.po_level);
  const poPoint = parseOptionalNonNegativeInteger(values.po_point);

  if (
    poSubject.length === 0 ||
    poPoll1.length === 0 ||
    poPoll2.length === 0 ||
    poLevel === undefined ||
    poPoint === undefined
  ) {
    return null;
  }

  return {
    po_etc: normalizeOptionalText(values.po_etc),
    po_date: normalizeOptionalText(values.po_date),
    po_level: poLevel,
    po_point: poPoint,
    po_poll1: poPoll1,
    po_poll2: poPoll2,
    po_poll3: normalizeOptionalText(values.po_poll3),
    po_poll4: normalizeOptionalText(values.po_poll4),
    po_poll5: normalizeOptionalText(values.po_poll5),
    po_poll6: normalizeOptionalText(values.po_poll6),
    po_poll7: normalizeOptionalText(values.po_poll7),
    po_poll8: normalizeOptionalText(values.po_poll8),
    po_poll9: normalizeOptionalText(values.po_poll9),
    po_subject: poSubject,
    po_use: values.po_use ? 1 : 0,
  };
}

export function buildPollUpdateInput(
  poll: AdminPoll,
  values: PollFormValues,
): AdminPollUpdateInput | null {
  const poSubject = values.po_subject.trim();
  const poPoll1 = values.po_poll1.trim();
  const poPoll2 = values.po_poll2.trim();
  const poLevel = parseOptionalNonNegativeInteger(values.po_level);
  const poPoint = parseOptionalNonNegativeInteger(values.po_point);

  if (
    poSubject.length === 0 ||
    poPoll1.length === 0 ||
    poPoll2.length === 0 ||
    poLevel === undefined ||
    poPoint === undefined
  ) {
    return null;
  }

  const input: AdminPollUpdateInput = {
    po_etc: null,
    po_id: poll.po_id,
    po_level: null,
    po_point: null,
    po_poll1: null,
    po_poll2: null,
    po_poll3: null,
    po_poll4: null,
    po_poll5: null,
    po_poll6: null,
    po_poll7: null,
    po_poll8: null,
    po_poll9: null,
    po_subject: null,
    po_use: null,
  };

  let changed = false;

  for (const field of pollTextFields) {
    const currentValue = (poll[field] ?? "").trim();
    const nextValue = values[field].trim();
    if (currentValue !== nextValue) {
      input[field] = nextValue;
      changed = true;
    }
  }

  if ((poll.po_level ?? null) !== poLevel) {
    input.po_level = poLevel;
    changed = true;
  }

  if ((poll.po_point ?? null) !== poPoint) {
    input.po_point = poPoint;
    changed = true;
  }

  const currentUse = (poll.po_use ?? 0) === 1 ? 1 : 0;
  const nextUse = values.po_use ? 1 : 0;
  if (currentUse !== nextUse) {
    input.po_use = nextUse;
    changed = true;
  }

  return changed ? input : null;
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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
