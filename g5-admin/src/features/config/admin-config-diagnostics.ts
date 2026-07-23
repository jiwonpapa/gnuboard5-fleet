import type { PageDiagnosticsDescriptor } from "../../debug/page-diagnostics";
import type { AdminConfigResponse } from "../../types/AdminConfigResponse";
import type { AdminConfigFormValues } from "./admin-config-form";

export function buildAdminConfigDiagnosticsDescriptor(props: {
  configResponse: AdminConfigResponse | undefined;
  hasChanges: boolean;
  updateResponse: AdminConfigResponse | undefined;
  values: AdminConfigFormValues;
}): PageDiagnosticsDescriptor {
  const configuredAdminId = props.values.cf_admin.trim();
  const extraTextCount = Object.values(props.values.extraTexts).filter(
    (value) => value.trim().length > 0,
  ).length;
  const extraFlagCount = Object.values(props.values.extraFlags).filter(Boolean).length;

  return {
    commands: [
      {
        apiTarget: "/admin/config",
        command: "cmd_admin_config_get",
        label: "기본환경설정 조회",
      },
      {
        apiTarget: "/admin/config",
        command: "cmd_admin_config_update",
        label: "기본환경설정 저장",
      },
      {
        apiTarget: "/admin/schema/config",
        command: "cmd_admin_schema_get",
        label: "config 스키마 조회",
      },
    ],
    description: "config 도메인 조회·저장·스키마 소비 경로를 동일한 진단 패널에서 추적합니다.",
    items: [
      { label: "변경 여부", value: props.hasChanges },
      { label: "사이트 제목", value: props.values.cf_title },
      { label: "최고관리자", value: configuredAdminId },
      { label: "관리자 이메일", value: props.values.cf_admin_email },
      { label: "추가 텍스트 입력", value: extraTextCount },
      { label: "추가 토글 ON", value: extraFlagCount },
      {
        label: "request_id",
        value: props.updateResponse?.request_id ?? props.configResponse?.request_id ?? "-",
      },
      {
        label: "correlation_id",
        value:
          props.updateResponse?.correlation_id ?? props.configResponse?.correlation_id ?? "-",
      },
      {
        label: "server_request_id",
        value:
          props.updateResponse?.server_request_id
          ?? props.configResponse?.server_request_id
          ?? "-",
      },
    ],
    title: "기본환경설정",
  };
}
