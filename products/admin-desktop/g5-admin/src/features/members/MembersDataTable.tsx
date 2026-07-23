import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "../../components/ui/badge";
import type { AdminMemberListItem } from "../../types/AdminMemberListItem";

const columnHelper = createColumnHelper<AdminMemberListItem>();

const columns = [
  columnHelper.accessor("mb_id", {
    header: "회원 ID",
    cell: (info) => (
      <div className="min-w-0 space-y-1">
        <strong className="block break-words text-sm font-semibold text-foreground">
          {info.getValue()}
        </strong>
        <span className="block break-words text-xs text-muted-foreground">
          {info.row.original.mb_email ?? "이메일 없음"}
        </span>
      </div>
    ),
  }),
  columnHelper.display({
    id: "nickname",
    header: "이름/닉네임",
    cell: (info) => (
      <div className="min-w-0 space-y-1">
        <span className="block break-words text-sm text-foreground">
          {info.row.original.mb_nick ?? info.row.original.mb_name ?? "-"}
        </span>
        <span className="block break-words text-xs text-muted-foreground">
          {info.row.original.mb_name ?? "실명 없음"}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("mb_level", {
    header: "레벨",
    cell: (info) => (
      <Badge variant="outline" className="w-fit">
        Lv.{info.getValue() ?? "-"}
      </Badge>
    ),
  }),
  columnHelper.accessor("mb_point", {
    header: "포인트",
    cell: (info) => `${info.getValue() ?? 0}`,
  }),
  columnHelper.display({
    id: "status",
    header: "상태",
    cell: (info) => {
      if (info.row.original.mb_leave_date) {
        return <Badge variant="outline">탈퇴</Badge>;
      }

      if (info.row.original.mb_intercept_date) {
        return <Badge variant="secondary">차단</Badge>;
      }

      return <Badge variant="outline">정상</Badge>;
    },
  }),
];

export function MembersDataTable(props: {
  isBusy: boolean;
  members: AdminMemberListItem[];
  onSelectMember: (mbId: string) => void;
  selectedMemberId: string | null;
}) {
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is the approved grid primitive for admin list routes.
  const table = useReactTable({
    data: props.members,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (props.members.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-background/80 px-5 py-8 text-center text-[0.82rem] text-muted-foreground">
        조회된 회원이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse text-left text-[0.84rem]">
          <thead className="bg-muted/60 text-muted-foreground">
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
              const isSelected = row.original.mb_id === props.selectedMemberId;

              return (
                <tr
                  key={row.id}
                  className={
                    isSelected
                      ? "cursor-pointer border-t border-border bg-primary/5"
                      : "cursor-pointer border-t border-border hover:bg-muted/40"
                  }
                  onClick={() => {
                    if (!props.isBusy) {
                      props.onSelectMember(row.original.mb_id);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3.5 py-3 align-top break-words text-[0.83rem]"
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
