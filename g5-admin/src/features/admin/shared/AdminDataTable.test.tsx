import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminDataTable } from "./AdminDataTable";

describe("AdminDataTable", () => {
  it("renders rows and forwards row clicks", () => {
    const handleClick = vi.fn();

    render(
      <AdminDataTable
        columns={[
          { header: "이름", render: (row: { id: string; name: string }) => row.name },
          { header: "설명", render: (row: { id: string; detail: string }) => row.detail },
        ]}
        emptyMessage="비어 있음"
        getRowKey={(row) => row.id}
        onRowClick={handleClick}
        rows={[
          { id: "one", name: "첫 번째", detail: "설명" },
          { id: "two", name: "두 번째", detail: "설명2" },
        ]}
        selectedKey="two"
      />,
    );

    fireEvent.click(screen.getByText("두 번째"));

    expect(handleClick).toHaveBeenCalledWith({
      id: "two",
      name: "두 번째",
      detail: "설명2",
    });
    expect(screen.getByText("설명2")).toBeInTheDocument();
  });

  it("renders the empty message when no rows exist", () => {
    render(
      <AdminDataTable
        columns={[{ header: "이름", render: (row: { id: string }) => row.id }]}
        emptyMessage="비어 있음"
        getRowKey={(row) => row.id}
        rows={[]}
      />,
    );

    expect(screen.getByText("비어 있음")).toBeInTheDocument();
  });
});
