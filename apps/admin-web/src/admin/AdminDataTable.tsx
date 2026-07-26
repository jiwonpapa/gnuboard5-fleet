import type { ReactNode } from "react";

export interface AdminDataTableColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export function AdminDataTable<T>(props: {
  columns: AdminDataTableColumn<T>[];
  emptyMessage: string;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rows: T[];
  selectedKey?: string | null;
}) {
  if (!props.rows.length) {
    return <div className="selection-placeholder">{props.emptyMessage}</div>;
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column.header}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => {
            const key = props.getRowKey(row);
            return (
              <tr
                key={key}
                data-selected={props.selectedKey === key}
                onClick={() => props.onRowClick?.(row)}
              >
                {props.columns.map((column) => (
                  <td key={column.header}>{column.render(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
