import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InfoField,
  ReadOnlyField,
  SelectInputControlField,
  SelectInputField,
  TextAreaInputControlField,
  TextAreaInputField,
  TextInputControlField,
  TextInputField,
  ToggleControlField,
  ToggleField,
} from "./AdminFormFields";
import { ThemeProvider, devModeStorageKey } from "../../layout/theme";

type FormValues = {
  text: string;
  select: string;
  textarea: string;
  enabled: boolean;
};

function ControlHarness() {
  const form = useForm<FormValues>({
    defaultValues: {
      text: "초기값",
      select: "b",
      textarea: "본문",
      enabled: true,
    },
  });

  return (
    <form>
      <TextInputControlField
        control={form.control}
        label="텍스트"
        name="text"
      />
      <SelectInputControlField
        control={form.control}
        label="선택"
        name="select"
        options={[
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ]}
      />
      <TextAreaInputControlField
        control={form.control}
        label="본문"
        name="textarea"
      />
      <ToggleControlField
        control={form.control}
        label="활성"
        name="enabled"
      />
    </form>
  );
}

function ErrorHarness() {
  const form = useForm<FormValues>({
    defaultValues: {
      text: "",
      select: "",
      textarea: "",
      enabled: false,
    },
  });

  useEffect(() => {
    form.setError("text", { type: "manual", message: "텍스트 오류" });
    form.setError("select", { type: "manual", message: "선택 오류" });
    form.setError("textarea", { type: "manual", message: "본문 오류" });
    form.setError("enabled", { type: "manual", message: "활성 오류" });
  }, [form]);

  return (
    <form>
      <TextInputControlField
        control={form.control}
        description="텍스트 설명"
        label="텍스트"
        name="text"
      />
      <SelectInputControlField
        control={form.control}
        description="선택 설명"
        label="선택"
        name="select"
        options={[
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ]}
      />
      <TextAreaInputControlField
        control={form.control}
        description="본문 설명"
        label="본문"
        name="textarea"
      />
      <ToggleControlField
        control={form.control}
        description="활성 설명"
        label="활성"
        name="enabled"
      />
    </form>
  );
}

describe("AdminFormFields", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders uncontrolled field helpers", () => {
    const handleText = vi.fn();
    const handleSelect = vi.fn();
    const handleArea = vi.fn();
    const handleToggle = vi.fn();

    render(
      <div>
        <TextInputField
          label="텍스트"
          value="값"
          onChange={handleText}
        />
        <SelectInputField
          label="선택"
          value="b"
          onChange={handleSelect}
          options={[
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ]}
        />
        <TextAreaInputField
          label="본문"
          value="내용"
          onChange={handleArea}
        />
        <ToggleField
          label="활성"
          checked
          onCheckedChange={handleToggle}
        />
      </div>,
    );

    expect(screen.getByLabelText("텍스트")).toHaveValue("값");
    expect(screen.getByLabelText("선택")).toHaveValue("b");
    expect(screen.getByLabelText("본문")).toHaveValue("내용");
  });

  it("binds control fields to react-hook-form", () => {
    render(<ControlHarness />);

    fireEvent.change(screen.getByLabelText("텍스트"), {
      target: { value: "변경값" },
    });
    fireEvent.change(screen.getByLabelText("선택"), {
      target: { value: "a" },
    });
    fireEvent.change(screen.getByLabelText("본문"), {
      target: { value: "수정 본문" },
    });

    expect(screen.getByLabelText("텍스트")).toHaveValue("변경값");
    expect(screen.getByLabelText("선택")).toHaveValue("a");
    expect(screen.getByLabelText("본문")).toHaveValue("수정 본문");
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("renders read-only and non-debug information fields with the expected guards", () => {
    window.localStorage.setItem(devModeStorageKey, "disabled");

    render(
      <ThemeProvider>
        <div>
          <InfoField label="request_id" value="req-123" />
          <InfoField label="상태" value="" />
          <ReadOnlyField
            label="게시판 코드"
            description="생성 후 수정할 수 없습니다."
            value=""
          />
        </div>
      </ThemeProvider>,
    );

    expect(screen.queryByText("request_id")).not.toBeInTheDocument();
    expect(screen.getByText("상태")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("읽기 전용")).toBeInTheDocument();
    expect(screen.getByText("생성 후 수정할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("-")).toHaveAttribute("readonly");
  });

  it("shows debug information labels in development mode", () => {
    window.localStorage.setItem(devModeStorageKey, "enabled");

    render(
      <ThemeProvider>
        <InfoField label="server_request_id" value="srv-456" />
      </ThemeProvider>,
    );

    expect(screen.getByText("server_request_id")).toBeInTheDocument();
    expect(screen.getByText("srv-456")).toBeInTheDocument();
  });

  it("renders descriptions and validation messages for controlled fields", () => {
    render(<ErrorHarness />);

    const [textInput, textArea] = screen.getAllByRole("textbox");

    expect(screen.getByText("텍스트 설명")).toBeInTheDocument();
    expect(screen.getByText("텍스트 오류")).toBeInTheDocument();
    expect(screen.getByText("선택 오류")).toBeInTheDocument();
    expect(screen.getByText("본문 오류")).toBeInTheDocument();
    expect(screen.getByText("활성 오류")).toBeInTheDocument();
    expect(textInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
    expect(textArea).toHaveAttribute("aria-invalid", "true");
  });
});
