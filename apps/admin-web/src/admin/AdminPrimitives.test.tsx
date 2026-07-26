import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminDataTable } from "./AdminDataTable";
import { TextInputField, ToggleField } from "./AdminFormFields";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

describe("legacy admin primitives", () => {
  it("renders selectable typed rows and an explicit empty state", () => {
    const onRowClick = vi.fn();
    const { rerender } = render(
      <AdminDataTable
        columns={[{ header: "이름", render: (row) => row.name }]}
        emptyMessage="행 없음"
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
        rows={[{ id: "1", name: "관리자" }]}
        selectedKey="1"
      />,
    );
    fireEvent.click(screen.getByText("관리자"));
    expect(onRowClick).toHaveBeenCalledWith({ id: "1", name: "관리자" });
    rerender(
      <AdminDataTable<{ id: string; name: string }>
        columns={[{ header: "이름", render: (row) => row.name }]}
        emptyMessage="행 없음"
        getRowKey={(row) => row.id}
        rows={[]}
      />,
    );
    expect(screen.getByText("행 없음")).toBeVisible();
  });

  it("keeps controlled admin fields", () => {
    const onText = vi.fn();
    const onToggle = vi.fn();
    render(
      <>
        <TextInputField label="제목" onChange={onText} value="Fleet" />
        <ToggleField checked={false} label="사용" onChange={onToggle} />
      </>,
    );
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "G5 Fleet" },
    });
    fireEvent.click(screen.getByLabelText("사용"));
    expect(onText).toHaveBeenCalled();
    expect(onToggle).toHaveBeenCalled();
  });

  it("requires a visible confirmation before a destructive callback", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmActionDialog
        description="삭제 후 복구할 수 없습니다."
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open
        title="삭제 확인"
      />,
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
