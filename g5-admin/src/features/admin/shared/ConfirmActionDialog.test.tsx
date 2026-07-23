import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

describe("ConfirmActionDialog", () => {
  it("renders and handles confirm/cancel interactions", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmActionDialog
        description="정말로 삭제합니다."
        onCancel={onCancel}
        onConfirm={onConfirm}
        open
        title="삭제 확인"
      />,
    );

    fireEvent.click(screen.getByText("확인"));
    fireEvent.click(screen.getByText("취소"));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("does not render when closed", () => {
    render(
      <ConfirmActionDialog
        description="닫힘"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={false}
        title="닫힘"
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
