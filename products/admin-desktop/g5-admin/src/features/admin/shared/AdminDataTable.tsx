import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "../../../lib/utils";

type AdminDataTableColumn<T> = {
  cellClassName?: string;
  header: string;
  render: (row: T) => ReactNode;
};

export function AdminDataTable<T>(props: {
  columns: Array<AdminDataTableColumn<T>>;
  emptyMessage: string;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rows: T[];
  selectedKey?: string | null;
}) {
  const columnClassById = Object.fromEntries(
    props.columns.map((column, index) => [`column-${index}`, column.cellClassName]),
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is the approved CRUD grid primitive for admin list routes.
  const table = useReactTable({
    columns: props.columns.map((column, index) => ({
      cell: ({ row }: { row: { original: T } }) => column.render(row.original),
      header: column.header,
      id: `column-${index}`,
    })),
    data: props.rows,
    getCoreRowModel: getCoreRowModel(),
  });

  if (props.rows.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-background/80 px-5 py-8 text-center text-[0.82rem] text-muted-foreground">
        {props.emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card/98">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse text-left text-[0.84rem]">
          <thead className="border-b border-border bg-muted/45 text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3.5 py-2.5 text-[10px] font-semibold tracking-[0.16em] uppercase"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const rowKey = props.getRowKey(row.original);
              const isSelected = props.selectedKey === rowKey;

              return (
                <tr
                  key={rowKey}
                  className={cn(
                    "border-t border-border align-top",
                    props.onRowClick
                      ? "cursor-pointer hover:bg-muted/35"
                      : "cursor-default",
                    isSelected && "bg-primary/6",
                  )}
                  onClick={() => props.onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3.5 py-2.5 align-top break-words text-[0.83rem]",
                        columnClassById[cell.column.id],
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
