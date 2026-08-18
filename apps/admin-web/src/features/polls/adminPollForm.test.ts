import { describe, expect, it } from "vitest";

import { buildAdminPollCreate, buildAdminPollUpdate, emptyAdminPollForm } from "./adminPollForm";

describe("adminPollForm", () => {
  it("builds a validated create payload and omits empty optional choices", () => {
    expect(buildAdminPollCreate({
      ...emptyAdminPollForm,
      po_subject: " 다음 기능 ",
      po_poll1: " 투표 ",
      po_poll2: " 팝업 ",
    })).toEqual({
      po_subject: "다음 기능",
      po_poll1: "투표",
      po_poll2: "팝업",
      po_level: 1,
      po_point: 0,
      po_use: 1,
    });
  });

  it("keeps explicit empty values in a full update so choices can be cleared", () => {
    expect(buildAdminPollUpdate({
      ...emptyAdminPollForm,
      po_subject: "R21",
      po_poll1: "예",
      po_poll2: "아니오",
      po_poll3: "",
      po_use: false,
    })).toMatchObject({ po_poll3: "", po_use: 0 });
  });

  it("rejects missing required choices and invalid numeric values", () => {
    expect(buildAdminPollCreate(emptyAdminPollForm)).toBeNull();
    expect(buildAdminPollCreate({
      ...emptyAdminPollForm,
      po_subject: "R21",
      po_poll1: "예",
      po_poll2: "아니오",
      po_point: "-1",
    })).toBeNull();
  });
});
