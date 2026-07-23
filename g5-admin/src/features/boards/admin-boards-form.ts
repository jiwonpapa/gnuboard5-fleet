import { z } from "zod";
import type { AdminBoard } from "../../types/AdminBoard";
import type { AdminBoardCreateInput } from "../../types/AdminBoardCreateInput";
import type { AdminBoardUpdateInput } from "../../types/AdminBoardUpdateInput";
import {
  boardExtraFlagFieldNames,
  boardExtraTextFieldNames,
  type BoardExtraFlagFieldName,
  type BoardExtraTextFieldName,
} from "./board-field-meta";

const optionalNonNegativeInteger = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^\d+$/.test(value),
    "0 이상의 정수만 입력해 주세요.",
  );

const boardExtraFlagShape = Object.fromEntries(
  boardExtraFlagFieldNames.map((field) => [field, z.boolean()]),
) as Record<BoardExtraFlagFieldName, z.ZodBoolean>;

const boardExtraTextShape = Object.fromEntries(
  boardExtraTextFieldNames.map((field) => [field, z.string()]),
) as Record<BoardExtraTextFieldName, z.ZodString>;

export const boardFormSchema = z.object({
  bo_category_list: z.string().trim(),
  bo_comment_level: optionalNonNegativeInteger,
  bo_download_level: optionalNonNegativeInteger,
  bo_read_level: optionalNonNegativeInteger,
  bo_subject: z.string().trim().min(1, "게시판 제목을 입력해 주세요."),
  bo_table: z
    .string()
    .trim()
    .min(1, "bo_table을 입력해 주세요.")
    .max(20, "bo_table은 20자 이하여야 합니다.")
    .regex(/^[a-zA-Z0-9_]+$/, "bo_table은 영문, 숫자, 밑줄만 허용합니다."),
  bo_upload_count: optionalNonNegativeInteger,
  bo_upload_size: optionalNonNegativeInteger,
  bo_use_category: z.boolean(),
  bo_use_secret: z.boolean(),
  bo_write_level: optionalNonNegativeInteger,
  extraFlags: z.object(boardExtraFlagShape),
  extraTexts: z.object(boardExtraTextShape),
  gr_id: z.string().trim().min(1, "그룹 ID를 입력해 주세요."),
});

export type BoardFormValues = z.infer<typeof boardFormSchema>;

export function emptyBoardFormValues(): BoardFormValues {
  return {
    bo_category_list: "",
    bo_comment_level: "",
    bo_download_level: "",
    bo_read_level: "",
    bo_subject: "",
    bo_table: "",
    bo_upload_count: "",
    bo_upload_size: "",
    bo_use_category: false,
    bo_use_secret: false,
    bo_write_level: "",
    extraFlags: createEmptyExtraFlags(),
    extraTexts: createEmptyExtraTexts(),
    gr_id: "",
  };
}

export function toBoardFormValues(
  board: AdminBoard | null | undefined,
): BoardFormValues {
  if (!board) {
    return emptyBoardFormValues();
  }

  const extraTexts = createEmptyExtraTexts();
  for (const field of boardExtraTextFieldNames) {
    extraTexts[field] = board.extra?.[field] ?? "";
  }

  const extraFlags = createEmptyExtraFlags();
  for (const field of boardExtraFlagFieldNames) {
    extraFlags[field] = normalizeFlag(board.extra?.[field]);
  }

  return {
    bo_category_list: board.bo_category_list ?? "",
    bo_comment_level: stringifyOptionalNumber(board.bo_comment_level),
    bo_download_level: stringifyOptionalNumber(board.bo_download_level),
    bo_read_level: stringifyOptionalNumber(board.bo_read_level),
    bo_subject: board.bo_subject ?? "",
    bo_table: board.bo_table,
    bo_upload_count: stringifyOptionalNumber(board.bo_upload_count),
    bo_upload_size: stringifyOptionalNumber(board.bo_upload_size),
    bo_use_category: (board.bo_use_category ?? 0) === 1,
    bo_use_secret: (board.bo_use_secret ?? 0) === 1,
    bo_write_level: stringifyOptionalNumber(board.bo_write_level),
    extraFlags,
    extraTexts,
    gr_id: board.gr_id ?? "",
  };
}

export function buildBoardCreateInput(
  values: BoardFormValues,
): AdminBoardCreateInput | null {
  const boTable = values.bo_table.trim();
  const boSubject = values.bo_subject.trim();
  const grId = values.gr_id.trim();

  if (
    boTable.length === 0 ||
    !/^[a-zA-Z0-9_]{1,20}$/.test(boTable) ||
    boSubject.length === 0 ||
    grId.length === 0
  ) {
    return null;
  }

  const boReadLevel = parseOptionalNonNegativeInteger(values.bo_read_level);
  const boWriteLevel = parseOptionalNonNegativeInteger(values.bo_write_level);
  const boCommentLevel = parseOptionalNonNegativeInteger(values.bo_comment_level);
  const boDownloadLevel = parseOptionalNonNegativeInteger(values.bo_download_level);
  const boUploadCount = parseOptionalNonNegativeInteger(values.bo_upload_count);
  const boUploadSize = parseOptionalNonNegativeInteger(values.bo_upload_size);

  if (
    boReadLevel === undefined ||
    boWriteLevel === undefined ||
    boCommentLevel === undefined ||
    boDownloadLevel === undefined ||
    boUploadCount === undefined ||
    boUploadSize === undefined
  ) {
    return null;
  }

  return {
    bo_category_list: values.bo_category_list.trim(),
    bo_comment_level: boCommentLevel,
    bo_download_level: boDownloadLevel,
    bo_read_level: boReadLevel,
    bo_subject: boSubject,
    bo_table: boTable,
    bo_upload_count: boUploadCount,
    bo_upload_size: boUploadSize,
    bo_use_category: values.bo_use_category ? 1 : 0,
    bo_use_secret: values.bo_use_secret ? 1 : 0,
    bo_write_level: boWriteLevel,
    extra: buildBoardExtraCreateMap(values),
    gr_id: grId,
  };
}

export function buildBoardUpdateInput(
  board: AdminBoard,
  values: BoardFormValues,
): AdminBoardUpdateInput | null {
  const boReadLevel = parseOptionalNonNegativeInteger(values.bo_read_level);
  const boWriteLevel = parseOptionalNonNegativeInteger(values.bo_write_level);
  const boCommentLevel = parseOptionalNonNegativeInteger(values.bo_comment_level);
  const boDownloadLevel = parseOptionalNonNegativeInteger(values.bo_download_level);
  const boUploadCount = parseOptionalNonNegativeInteger(values.bo_upload_count);
  const boUploadSize = parseOptionalNonNegativeInteger(values.bo_upload_size);

  if (
    boReadLevel === undefined ||
    boWriteLevel === undefined ||
    boCommentLevel === undefined ||
    boDownloadLevel === undefined ||
    boUploadCount === undefined ||
    boUploadSize === undefined
  ) {
    return null;
  }

  const input: AdminBoardUpdateInput = {
    bo_category_list: null,
    bo_comment_level: null,
    bo_download_level: null,
    bo_read_level: null,
    bo_subject: null,
    bo_table: board.bo_table,
    bo_upload_count: null,
    bo_upload_size: null,
    bo_use_category: null,
    bo_use_secret: null,
    bo_write_level: null,
    extra: {},
    gr_id: null,
  };

  let changed = false;

  const textFields = [
    "bo_subject",
    "gr_id",
    "bo_category_list",
  ] as const satisfies Array<
    keyof Pick<BoardFormValues, "bo_subject" | "gr_id" | "bo_category_list">
  >;

  for (const field of textFields) {
    const currentValue =
      field === "bo_subject"
        ? board.bo_subject ?? ""
        : field === "gr_id"
          ? board.gr_id ?? ""
          : board.bo_category_list ?? "";
    const nextValue = values[field].trim();
    if (currentValue.trim() !== nextValue) {
      input[field] = nextValue;
      changed = true;
    }
  }

  changed = assignNumberChange(input, "bo_read_level", board.bo_read_level, boReadLevel) || changed;
  changed =
    assignNumberChange(input, "bo_write_level", board.bo_write_level, boWriteLevel) || changed;
  changed =
    assignNumberChange(
      input,
      "bo_comment_level",
      board.bo_comment_level,
      boCommentLevel,
    ) || changed;
  changed =
    assignNumberChange(
      input,
      "bo_download_level",
      board.bo_download_level,
      boDownloadLevel,
    ) || changed;
  changed =
    assignNumberChange(input, "bo_upload_count", board.bo_upload_count, boUploadCount) ||
    changed;
  changed =
    assignNumberChange(input, "bo_upload_size", board.bo_upload_size, boUploadSize) ||
    changed;

  const currentUseCategory = (board.bo_use_category ?? 0) === 1 ? 1 : 0;
  const nextUseCategory = values.bo_use_category ? 1 : 0;
  if (currentUseCategory !== nextUseCategory) {
    input.bo_use_category = nextUseCategory;
    changed = true;
  }

  const currentUseSecret = (board.bo_use_secret ?? 0) === 1 ? 1 : 0;
  const nextUseSecret = values.bo_use_secret ? 1 : 0;
  if (currentUseSecret !== nextUseSecret) {
    input.bo_use_secret = nextUseSecret;
    changed = true;
  }

  const extraChanges = buildBoardExtraUpdateMap(board, values);
  if (Object.keys(extraChanges).length > 0) {
    input.extra = extraChanges;
    changed = true;
  }

  return changed ? input : null;
}

function buildBoardExtraCreateMap(values: BoardFormValues) {
  const payload: Record<string, string> = {};

  for (const field of boardExtraTextFieldNames) {
    const normalized = (values.extraTexts[field] ?? "").trim();
    if (normalized.length > 0) {
      payload[field] = normalized;
    }
  }

  for (const field of boardExtraFlagFieldNames) {
    if (values.extraFlags[field] ?? false) {
      payload[field] = "1";
    }
  }

  return payload;
}

function buildBoardExtraUpdateMap(board: AdminBoard, values: BoardFormValues) {
  const payload: Record<string, string> = {};

  for (const field of boardExtraTextFieldNames) {
    const currentValue = normalizeText(board.extra?.[field] ?? "");
    const nextValue = normalizeText(values.extraTexts[field] ?? "");
    if (currentValue !== nextValue) {
      payload[field] = nextValue;
    }
  }

  for (const field of boardExtraFlagFieldNames) {
    const currentValue = normalizeFlag(board.extra?.[field]) ? "1" : "0";
    const nextValue = (values.extraFlags[field] ?? false) ? "1" : "0";
    if (currentValue !== nextValue) {
      payload[field] = nextValue;
    }
  }

  return payload;
}

function assignNumberChange(
  input: AdminBoardUpdateInput,
  field:
    | "bo_read_level"
    | "bo_write_level"
    | "bo_comment_level"
    | "bo_download_level"
    | "bo_upload_count"
    | "bo_upload_size",
  currentValue: number | null | undefined,
  nextValue: number | null,
) {
  if ((currentValue ?? null) === nextValue) {
    return false;
  }

  input[field] = nextValue;
  return true;
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

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeFlag(value: string | null | undefined) {
  const normalized = normalizeText(value).toLowerCase();
  return ["1", "true", "on", "yes", "y"].includes(normalized);
}

function createEmptyExtraTexts(): Record<BoardExtraTextFieldName, string> {
  return Object.fromEntries(
    boardExtraTextFieldNames.map((field) => [field, ""]),
  ) as Record<BoardExtraTextFieldName, string>;
}

function createEmptyExtraFlags(): Record<BoardExtraFlagFieldName, boolean> {
  return Object.fromEntries(
    boardExtraFlagFieldNames.map((field) => [field, false]),
  ) as Record<BoardExtraFlagFieldName, boolean>;
}
