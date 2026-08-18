import type { AdminPoll, AdminPollCreate, AdminPollUpdate } from "../../api/fleet";

export interface AdminPollFormDraft {
  po_subject: string;
  po_poll1: string;
  po_poll2: string;
  po_poll3: string;
  po_poll4: string;
  po_poll5: string;
  po_poll6: string;
  po_poll7: string;
  po_poll8: string;
  po_poll9: string;
  po_etc: string;
  po_level: string;
  po_point: string;
  po_use: boolean;
}

export const emptyAdminPollForm: AdminPollFormDraft = {
  po_subject: "",
  po_poll1: "",
  po_poll2: "",
  po_poll3: "",
  po_poll4: "",
  po_poll5: "",
  po_poll6: "",
  po_poll7: "",
  po_poll8: "",
  po_poll9: "",
  po_etc: "",
  po_level: "1",
  po_point: "0",
  po_use: true,
};

const optionalChoices = [
  "po_poll3",
  "po_poll4",
  "po_poll5",
  "po_poll6",
  "po_poll7",
  "po_poll8",
  "po_poll9",
] as const;

export function pollDraft(poll: AdminPoll): AdminPollFormDraft {
  return {
    po_subject: poll.po_subject,
    po_poll1: poll.po_poll1,
    po_poll2: poll.po_poll2,
    po_poll3: poll.po_poll3,
    po_poll4: poll.po_poll4,
    po_poll5: poll.po_poll5,
    po_poll6: poll.po_poll6,
    po_poll7: poll.po_poll7,
    po_poll8: poll.po_poll8,
    po_poll9: poll.po_poll9,
    po_etc: poll.po_etc,
    po_level: String(poll.po_level),
    po_point: String(poll.po_point),
    po_use: poll.po_use === 1,
  };
}

export function buildAdminPollCreate(draft: AdminPollFormDraft): AdminPollCreate | null {
  const core = validateDraft(draft);
  if (!core) return null;
  const create: AdminPollCreate = core;
  for (const field of optionalChoices) {
    const value = draft[field].trim();
    if (value) create[field] = value;
  }
  const etc = draft.po_etc.trim();
  if (etc) create.po_etc = etc;
  return create;
}

export function buildAdminPollUpdate(draft: AdminPollFormDraft): AdminPollUpdate | null {
  const core = validateDraft(draft);
  if (!core) return null;
  return {
    ...core,
    po_poll3: draft.po_poll3.trim(),
    po_poll4: draft.po_poll4.trim(),
    po_poll5: draft.po_poll5.trim(),
    po_poll6: draft.po_poll6.trim(),
    po_poll7: draft.po_poll7.trim(),
    po_poll8: draft.po_poll8.trim(),
    po_poll9: draft.po_poll9.trim(),
    po_etc: draft.po_etc.trim(),
  };
}

function validateDraft(draft: AdminPollFormDraft): AdminPollCreate | null {
  const subject = draft.po_subject.trim();
  const first = draft.po_poll1.trim();
  const second = draft.po_poll2.trim();
  const level = Number(draft.po_level);
  const point = Number(draft.po_point);
  if (!subject || !first || !second) return null;
  if (!Number.isSafeInteger(level) || level < 0) return null;
  if (!Number.isSafeInteger(point) || point < 0) return null;
  if (draft.po_etc.trim().length > 125) return null;
  return {
    po_subject: subject,
    po_poll1: first,
    po_poll2: second,
    po_level: level,
    po_point: point,
    po_use: draft.po_use ? 1 : 0,
  };
}
