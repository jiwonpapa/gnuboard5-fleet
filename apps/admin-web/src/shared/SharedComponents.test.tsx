import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TransportError } from "../transport/contracts";
import {
  ErrorBanner,
  ListPagination,
  SelectionPlaceholder,
} from "./SharedComponents";

describe("shared components", () => {
  it("shows traceable errors, pagination and selection placeholders", () => {
    const next = vi.fn();
    render(
      <>
        <ErrorBanner
          error={new TransportError(503, "upstream", "연결 실패", "req-1")}
        />
        <ListPagination
          hasNext
          hasPrev={false}
          isBusy={false}
          onNext={next}
          onPrev={vi.fn()}
          page={1}
          total={30}
          totalPages={2}
        />
        <SelectionPlaceholder description="항목을 선택하세요." />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("req-1");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(next).toHaveBeenCalledOnce();
    expect(screen.getByText("항목을 선택하세요.")).toBeVisible();
  });
});
