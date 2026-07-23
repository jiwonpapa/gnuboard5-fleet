import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPageDiagnostics } from "../../debug/page-diagnostics";
import {
  createConfigResponse,
  createSchemaResponse,
} from "./admin-config-page-test-fixtures";
import {
  getPrimarySaveButton,
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

describe("AdminConfigPage validation", () => {
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

  it("updates config from the page when a diff-only field changes", async () => {
    apiMocks.updateAdminConfig.mockResolvedValue({
      ...createConfigResponse(),
      config: {
        ...createConfigResponse().config,
        cf_title: "새 사이트",
      },
    });

    renderAdminConfigPage({ apiMocks });

    fireEvent.change(await screen.findByLabelText("홈페이지 제목"), {
      target: { value: "새 사이트" },
    });
    fireEvent.click(getPrimarySaveButton());

    await waitFor(() => {
      expect(apiMocks.updateAdminConfig).toHaveBeenCalled();
      expect(apiMocks.updateAdminConfig.mock.calls[0]?.[0]).toEqual({
        cf_title: "새 사이트",
        extra: {},
      });
    });
  });

  it("shows validation feedback for invalid admin email before save", async () => {
    renderAdminConfigPage({ apiMocks });

    fireEvent.change(await screen.findByLabelText("관리자 메일 주소"), {
      target: { value: "invalid-email" },
    });
    fireEvent.click(getPrimarySaveButton());

    expect(
      await screen.findByText("올바른 이메일 형식이 아닙니다."),
    ).toBeInTheDocument();
    expect(apiMocks.updateAdminConfig).not.toHaveBeenCalled();
  });

  it("opens the invalid tab and focuses the first invalid field on submit", async () => {
    const user = userEvent.setup();
    const configResponse = createConfigResponse();
    configResponse.config.extra.cf_add_script = "console.log('active');";
    const schemaResponse = createSchemaResponse();
    schemaResponse.schema.fields_by_name.cf_add_script.required = true;
    schemaResponse.schema.sections[10] = {
      ...schemaResponse.schema.sections[10]!,
      description: "레이아웃 추가 스크립트를 입력합니다.",
      fields: [schemaResponse.schema.fields_by_name.cf_add_script],
    };

    renderAdminConfigPage({ apiMocks, configResponse, schemaResponse });

    await user.click(await screen.findByRole("tab", { name: "레이아웃 추가설정" }));
    const addScriptField = screen.getByLabelText("추가 스크립트");
    expect(addScriptField).toHaveValue("console.log('active');");
    await user.clear(addScriptField);

    await user.click(screen.getByRole("tab", { name: "기본환경" }));
    await user.click(getPrimarySaveButton());

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "레이아웃 추가설정" }),
      ).toHaveAttribute("data-state", "active");
      expect(screen.getByLabelText("추가 스크립트")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("추가 스크립트")).toHaveFocus();
    });
    expect(apiMocks.updateAdminConfig).not.toHaveBeenCalled();
  });

  it("blocks submit when a required schema field is blank", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    const titleField = (await screen.findByLabelText("홈페이지 제목")) as HTMLInputElement;
    await user.clear(titleField);
    fireEvent.click(getPrimarySaveButton());

    expect(await screen.findByText("홈페이지 제목 항목은 비워둘 수 없습니다.")).toBeInTheDocument();
    expect(apiMocks.updateAdminConfig).not.toHaveBeenCalled();
  });

  it("blocks submit when a required numeric schema field is blank", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    const loginPointField = (await screen.findByLabelText("로그인 포인트")) as HTMLInputElement;
    await user.clear(loginPointField);
    fireEvent.click(getPrimarySaveButton());

    expect(await screen.findByText("로그인 포인트 항목은 비워둘 수 없습니다.")).toBeInTheDocument();
    expect(apiMocks.updateAdminConfig).not.toHaveBeenCalled();
  });

  it("renders checkbox choice fields and submits CSV diffs", async () => {
    const user = userEvent.setup();

    renderAdminConfigPage({ apiMocks });

    await user.click(await screen.findByRole("tab", { name: "SNS" }));

    const naver = screen.getByLabelText("네이버 로그인을 사용합니다") as HTMLInputElement;
    const kakao = screen.getByLabelText("카카오 로그인을 사용합니다") as HTMLInputElement;
    const payco = screen.getByLabelText("페이코 로그인을 사용합니다") as HTMLInputElement;

    expect(naver.checked).toBe(true);
    expect(kakao.checked).toBe(true);
    expect(payco.checked).toBe(false);

    await user.click(payco);
    fireEvent.click(getPrimarySaveButton());

    await waitFor(() => {
      expect(apiMocks.updateAdminConfig).toHaveBeenCalled();
      expect(
        apiMocks.updateAdminConfig.mock.calls[
          apiMocks.updateAdminConfig.mock.calls.length - 1
        ]?.[0],
      ).toEqual({
        extra: {
          cf_social_servicelist: "naver,kakao,payco",
        },
      });
    });
  });
});
