import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { ListPagination } from "../shared/ListPagination";
import type { Pagination } from "../../types/Pagination";
import type { AdminSmsContactGroup } from "../../types/AdminSmsContactGroup";
import type { AdminSmsContactItem } from "../../types/AdminSmsContactItem";
import { adminSmsContactSearchFieldOptions } from "./admin-sms-contacts-form";

export function AdminSmsContactsListSection(props: {
  batchTarget: string;
  contacts: AdminSmsContactItem[];
  groups: AdminSmsContactGroup[];
  isBusy: boolean;
  onBatchAction: (action: "allow" | "copy" | "delete" | "move" | "reject") => void;
  onBatchTargetChange: (value: string) => void;
  onContactSelect: (contact: AdminSmsContactItem) => void;
  onPageNext: () => void;
  onPagePrev: () => void;
  onSearchChange: (value: string) => void;
  onSearchFieldChange: (value: string) => void;
  onSelectionToggle: (contactId: number, checked: boolean) => void;
  onToggleWithPhoneOnly: () => void;
  pagination: Pagination | null;
  search: string;
  searchField: string;
  selectedContactId: number | null;
  selectedContactIds: number[];
  withPhoneOnly: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>연락처 목록</CardTitle>
        <CardDescription>
          검색, 수신동의 필터, 일괄 허용/거부/이동/복사/삭제를 지원합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[11rem_minmax(0,1fr)_auto]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">검색 기준</span>
            <select
              value={props.searchField}
              onChange={(event) => props.onSearchFieldChange(event.currentTarget.value)}
              className="flex h-9 w-full rounded-sm border border-input bg-background px-3 py-2 text-[0.82rem] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {adminSmsContactSearchFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">검색어</span>
            <Input
              className="text-[0.82rem]"
              value={props.search}
              onChange={(event) => props.onSearchChange(event.currentTarget.value)}
              placeholder="이름 또는 번호 검색"
            />
          </label>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant={props.withPhoneOnly ? "default" : "outline"}
              onClick={props.onToggleWithPhoneOnly}
            >
              번호 있는 항목만
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_repeat(4,auto)]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">이동/복사 대상 그룹</span>
            <select
              value={props.batchTarget}
              onChange={(event) => props.onBatchTargetChange(event.currentTarget.value)}
              className="flex h-9 w-full rounded-sm border border-input bg-background px-3 py-2 text-[0.82rem] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">대상 그룹 선택</option>
              {props.groups.map((group) => (
                <option key={group.bg_no} value={String(group.bg_no)}>
                  {group.bg_name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={
                props.isBusy ||
                props.selectedContactIds.length === 0 ||
                props.batchTarget === ""
              }
              onClick={() => props.onBatchAction("move")}
            >
              선택 이동
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={
                props.isBusy ||
                props.selectedContactIds.length === 0 ||
                props.batchTarget === ""
              }
              onClick={() => props.onBatchAction("copy")}
            >
              선택 복사
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy || props.selectedContactIds.length === 0}
              onClick={() => props.onBatchAction("allow")}
            >
              수신 허용
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy || props.selectedContactIds.length === 0}
              onClick={() => props.onBatchAction("reject")}
            >
              수신 거부
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={props.isBusy || props.selectedContactIds.length === 0}
              onClick={() => props.onBatchAction("delete")}
            >
              선택 삭제
            </Button>
          </div>
        </div>

        <AdminDataTable
          columns={[
            {
              cellClassName: "w-16",
              header: "선택",
              render: (contact) => (
                <input
                  type="checkbox"
                  checked={props.selectedContactIds.includes(contact.bk_no)}
                  onChange={(event) => {
                    event.stopPropagation();
                    props.onSelectionToggle(contact.bk_no, event.currentTarget.checked);
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              ),
            },
            {
              header: "이름/번호",
              render: (contact) => (
                <div className="space-y-1">
                  <strong className="block text-sm font-semibold text-foreground">
                    {contact.bk_name}
                  </strong>
                  <span className="block text-xs text-muted-foreground">{contact.bk_hp}</span>
                </div>
              ),
            },
            {
              header: "그룹",
              render: (contact) => (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{contact.bg_name ?? `bg_no ${contact.bg_no}`}</p>
                  <p>{contact.mb_id ? `member ${contact.mb_id}` : "비회원"}</p>
                </div>
              ),
            },
            {
              header: "상태",
              render: (contact) => (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{contact.receipt_label ?? (contact.bk_receipt === 1 ? "허용" : "거부")}</p>
                  <p>{contact.bk_datetime ?? "-"}</p>
                </div>
              ),
            },
          ]}
          emptyMessage="등록된 연락처가 없습니다."
          getRowKey={(contact) => String(contact.bk_no)}
          onRowClick={props.onContactSelect}
          rows={props.contacts}
          selectedKey={props.selectedContactId === null ? null : String(props.selectedContactId)}
        />

        {props.pagination ? (
          <ListPagination
            hasNext={props.pagination.has_next}
            hasPrev={props.pagination.has_prev}
            isBusy={props.isBusy}
            onNext={props.onPageNext}
            onPrev={props.onPagePrev}
            page={props.pagination.page}
            total={props.pagination.total}
            totalPages={props.pagination.last_page}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
