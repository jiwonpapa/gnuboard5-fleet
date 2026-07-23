import { describe, expect, it } from "vitest";
import {
  buildPollCreateInput,
  buildPollUpdateInput,
  pollFormSchema,
  toPollFormValues,
} from "./admin-polls-form";
import type { AdminPoll } from "../../types/AdminPoll";

const baseline: AdminPoll = {
  mb_ids: null,
  po_cnt1: 10,
  po_cnt2: 5,
  po_cnt3: 0,
  po_cnt4: 0,
  po_cnt5: 0,
  po_cnt6: 0,
  po_cnt7: 0,
  po_cnt8: 0,
  po_cnt9: 0,
  po_date: "2026-03-07",
  po_etc: "기타",
  po_id: 3,
  po_ips: null,
  po_level: 1,
  po_point: 0,
  po_poll1: "예",
  po_poll2: "아니오",
  po_poll3: null,
  po_poll4: null,
  po_poll5: null,
  po_poll6: null,
  po_poll7: null,
  po_poll8: null,
  po_poll9: null,
  po_subject: "투표 제목",
  po_use: 1,
};

describe("admin-polls-form", () => {
  it("builds create payload", () => {
    expect(
      buildPollCreateInput({
        po_etc: "기타",
        po_date: "2026-03-07",
        po_level: "1",
        po_point: "0",
        po_poll1: "예",
        po_poll2: "아니오",
        po_poll3: "",
        po_poll4: "",
        po_poll5: "",
        po_poll6: "",
        po_poll7: "",
        po_poll8: "",
        po_poll9: "",
        po_subject: "투표 제목",
        po_use: true,
      }),
    ).toEqual({
      po_etc: "기타",
      po_date: "2026-03-07",
      po_level: 1,
      po_point: 0,
      po_poll1: "예",
      po_poll2: "아니오",
      po_poll3: null,
      po_poll4: null,
      po_poll5: null,
      po_poll6: null,
      po_poll7: null,
      po_poll8: null,
      po_poll9: null,
      po_subject: "투표 제목",
      po_use: 1,
    });
  });

  it("builds sparse update payload", () => {
    const next = toPollFormValues(baseline);
    next.po_use = false;
    next.po_poll3 = "모르겠다";

    expect(buildPollUpdateInput(baseline, next)).toEqual({
      po_etc: null,
      po_id: 3,
      po_level: null,
      po_point: null,
      po_poll1: null,
      po_poll2: null,
      po_poll3: "모르겠다",
      po_poll4: null,
      po_poll5: null,
      po_poll6: null,
      po_poll7: null,
      po_poll8: null,
      po_poll9: null,
      po_subject: null,
      po_use: 0,
    });
  });

  it("rejects an empty subject with zod", () => {
    expect(
      pollFormSchema.safeParse({
        ...toPollFormValues(baseline),
        po_subject: "",
      }).success,
    ).toBe(false);
  });
});
