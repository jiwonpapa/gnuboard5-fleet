import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPageDiagnostics } from "../../debug/page-diagnostics";
import {
  createConfigResponse,
  createSchemaResponse,
} from "./admin-config-page-test-fixtures";
import {
  renderAdminConfigPage,
  stubMatchMedia,
} from "./admin-config-page-test-support";

const apiMocks = vi.hoisted(() => ({
  getAdminConfig: vi.fn(),
  getAdminFieldSchema: vi.fn(),
  updateAdminConfig: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  getAdminConfig: apiMocks.getAdminConfig,
  getAdminFieldSchema: apiMocks.getAdminFieldSchema,
  updateAdminConfig: apiMocks.updateAdminConfig,
}));

vi.mock("../sites/site-routing", () => ({
  useCurrentSiteId: () => "site-1",
}));

describe("AdminConfigPage legacy editability", () => {
  beforeEach(() => {
    stubMatchMedia(true);
    apiMocks.getAdminConfig.mockResolvedValue(createConfigResponse());
    apiMocks.getAdminFieldSchema.mockResolvedValue(createSchemaResponse());
    apiMocks.updateAdminConfig.mockResolvedValue(createConfigResponse());
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearPageDiagnostics();
  });

  it("rejects a stale schema that duplicates the short-url field", async () => {
    const schemaResponse = createSchemaResponse();
    schemaResponse.schema.sections[0] = {
      ...schemaResponse.schema.sections[0]!,
      fields: [
        ...schemaResponse.schema.sections[0]!.fields,
        schemaResponse.schema.fields_by_name.cf_bbs_rewrite,
      ],
    };

    renderAdminConfigPage({ apiMocks, schemaResponse });

    expect(
      await screen.findByText("관리자 필드 스키마에 중복 필드가 있습니다: cf_bbs_rewrite"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("홈페이지 제목")).not.toBeInTheDocument();
  });

  it("keeps cf_admin editable even when a stale schema marks it readonly", async () => {
    const schemaResponse = createSchemaResponse({
      adminOptions: [
        { label: "선택안함", value: "" },
        { label: "admin", value: "admin" },
      ],
    });
    schemaResponse.schema.fields_by_name.cf_admin.readonly_on_update = true;
    schemaResponse.schema.sections[0]!.fields[1]!.readonly_on_update = true;
    apiMocks.getAdminFieldSchema.mockResolvedValue(schemaResponse);

    renderAdminConfigPage({ apiMocks });

    const adminIdField = (await screen.findByLabelText("최고관리자")) as HTMLSelectElement;

    expect(adminIdField.disabled).toBe(false);
    expect(adminIdField.tagName).toBe("SELECT");
  });

  it("keeps short-url, membership selects, and social login toggle editable even when a stale schema marks them readonly", async () => {
    const user = userEvent.setup();
    const schemaResponse = createSchemaResponse();
    schemaResponse.schema.fields_by_name.cf_bbs_rewrite.readonly_on_update = true;
    schemaResponse.schema.fields_by_name.cf_use_member_icon.readonly_on_update = true;
    schemaResponse.schema.fields_by_name.cf_icon_level.readonly_on_update = true;
    schemaResponse.schema.fields_by_name.cf_social_login_use.readonly_on_update = true;
    schemaResponse.schema.sections[4]!.fields[0]!.readonly_on_update = true;
    schemaResponse.schema.sections[2]!.fields[3]!.readonly_on_update = true;
    schemaResponse.schema.sections[2]!.fields[4]!.readonly_on_update = true;
    schemaResponse.schema.sections[9]!.fields[0]!.readonly_on_update = true;
    apiMocks.getAdminFieldSchema.mockResolvedValue(schemaResponse);

    renderAdminConfigPage({ apiMocks });

    await user.click(await screen.findByRole("tab", { name: "짧은주소" }));
    expect((screen.getByLabelText("글 이름") as HTMLInputElement).disabled).toBe(false);

    await user.click(await screen.findByRole("tab", { name: "회원가입" }));
    expect((screen.getByLabelText("회원아이콘 사용") as HTMLSelectElement).disabled).toBe(false);
    expect(
      (screen.getByLabelText("회원 아이콘, 이미지 업로드 권한") as HTMLSelectElement).disabled,
    ).toBe(false);

    await user.click(await screen.findByRole("tab", { name: "SNS" }));
    expect((screen.getByRole("switch") as HTMLButtonElement).ariaDisabled).not.toBe("true");
  });

  it("renders certificate mode as a select instead of a boolean switch", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    await user.click(await screen.findByRole("tab", { name: "본인확인" }));

    const certPanel = screen.getByRole("tabpanel");
    const certUseField = within(certPanel).getByRole("combobox") as HTMLSelectElement;
    expect(certUseField.tagName).toBe("SELECT");
    expect(certUseField.value).toBe("1");
    expect(within(certUseField).getByRole("option", { name: "실서비스" })).toBeInTheDocument();
  });

  it("keeps extra title and value fields editable even when stale schema marks them readonly", async () => {
    const user = userEvent.setup();
    const schemaResponse = createSchemaResponse();
    schemaResponse.schema.fields_by_name.cf_1_subj.readonly_on_update = true;
    schemaResponse.schema.fields_by_name.cf_1.readonly_on_update = true;
    schemaResponse.schema.sections[12]!.fields[0]!.readonly_on_update = true;
    schemaResponse.schema.sections[12]!.fields[1]!.readonly_on_update = true;
    apiMocks.getAdminFieldSchema.mockResolvedValue(schemaResponse);

    renderAdminConfigPage({ apiMocks });

    await user.click(await screen.findByRole("tab", { name: "여분필드" }));

    const titleField = screen.getByLabelText("여분필드1 제목") as HTMLInputElement;
    const valueField = screen.getByLabelText("여분필드1 값") as HTMLInputElement;

    expect(titleField.disabled).toBe(false);
    expect(valueField.disabled).toBe(false);
  });
});
