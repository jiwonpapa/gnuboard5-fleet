import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../layout/theme";
import { FieldSchemaStatePanel } from "./FieldSchemaStatePanel";
import { hasFieldSchemaState } from "./field-schema-state";

describe("FieldSchemaStatePanel", () => {
  it("treats error, loading, and null schema as guarded states", () => {
    expect(hasFieldSchemaState({ error: null, loading: false, schema: null })).toBe(true);
    expect(hasFieldSchemaState({ error: null, loading: true, schema: {} as never })).toBe(true);
    expect(
      hasFieldSchemaState({
        error: buildCommandError("schema failed"),
        loading: false,
        schema: {} as never,
      }),
    ).toBe(true);
    expect(hasFieldSchemaState({ error: null, loading: false, schema: {} as never })).toBe(false);
  });

  it("renders a loading placeholder while schema is pending", () => {
    render(
      <FieldSchemaStatePanel
        error={null}
        hiddenTargetLabel="설정 폼"
        loading
        noun="설정"
        schema={null}
      />,
    );

    expect(screen.getByText("설정 화면 구성을 불러오는 중입니다.")).toBeInTheDocument();
  });

  it("renders an error explanation when schema loading fails", () => {
    render(
      <ThemeProvider>
        <FieldSchemaStatePanel
          error={buildCommandError("설정 스키마를 불러오지 못했습니다.")}
          hiddenTargetLabel="설정 폼"
          loading={false}
          noun="설정"
          schema={null}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("설정 스키마를 불러오지 못했습니다.")).toBeInTheDocument();
    expect(
      screen.getByText(/화면 구성을 불러오지 못해 설정 폼을 잠시 숨겼습니다/),
    ).toBeInTheDocument();
  });
});

function buildCommandError(message: string) {
  return {
    code: "schema_error",
    command: "cmd_admin_schema_get",
    correlation_id: "c",
    detail: null,
    error_category: "integration",
    fault_domain: "client",
    guide: { action: "retry", reason: "schema" },
    message,
    operation: "getAdminFieldSchema",
    owner: "rust",
    request_id: "r",
    retryable: false,
    server_request_id: null,
    status: 500,
    target: "/admin/schema/config",
    user_actionable: true,
  };
}
