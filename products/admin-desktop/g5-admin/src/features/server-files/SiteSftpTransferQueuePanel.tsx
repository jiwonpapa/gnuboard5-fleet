import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Pause,
  RotateCcw,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type { SftpTransferQueueItem } from "../../types/SftpTransferQueueItem";
import type { SftpTransferQueueSnapshot } from "../../types/SftpTransferQueueSnapshot";

export function SiteSftpTransferQueuePanel(props: {
  snapshot: SftpTransferQueueSnapshot;
  pending: boolean;
  mutationPending: boolean;
  concurrencyPending: boolean;
  onCancel: (itemId: string) => void;
  onPause: (itemId: string) => void;
  onRetry: (itemId: string) => void;
  onSetConcurrency: (value: number) => void;
}) {
  const visibleItems = props.snapshot.items.slice(0, 32);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const failedItems = useMemo(
    () => props.snapshot.items.filter((item) => item.status === "failed"),
    [props.snapshot.items],
  );
  const recentCompletedItems = useMemo(
    () =>
      [...props.snapshot.items]
        .filter((item) => item.status === "succeeded" && item.completed_at_epoch_ms !== null)
        .sort((left, right) => {
          const leftCompleted =
            left.completed_at_epoch_ms === null ? 0 : Number(left.completed_at_epoch_ms);
          const rightCompleted =
            right.completed_at_epoch_ms === null ? 0 : Number(right.completed_at_epoch_ms);
          return rightCompleted - leftCompleted;
        })
        .slice(0, 3),
    [props.snapshot.items],
  );
  const recentCompletedBytes = useMemo(
    () =>
      recentCompletedItems.reduce((sum, item) => {
        if (item.copied_bytes === null) {
          return sum;
        }
        return sum + (typeof item.copied_bytes === "bigint" ? Number(item.copied_bytes) : item.copied_bytes);
      }, 0),
    [recentCompletedItems],
  );

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-border/70 bg-background">
      <div className="border-b border-border/70 px-3 py-0.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
              Transfer Queue
            </span>
            <span className="text-[11px] font-medium text-foreground">작업 큐</span>
            <span className="rounded-sm border border-border/70 px-1 py-0 text-[10px]">run {props.snapshot.active_count}</span>
            <span className="rounded-sm border border-border/70 px-1 py-0 text-[10px]">queue {props.snapshot.queued_count}</span>
            <span className="rounded-sm border border-border/70 px-1 py-0 text-[10px]">pause {props.snapshot.paused_count}</span>
            <span className="rounded-sm border border-border/70 px-1 py-0 text-[10px]">fail {props.snapshot.failed_count}</span>
            <span className="rounded-sm border border-border/70 px-1 py-0 text-[10px]">{props.snapshot.items.length} items</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ConcurrencyControl
              disabled={props.concurrencyPending}
              value={props.snapshot.concurrency_limit}
              onChange={props.onSetConcurrency}
            />
            {props.pending ? (
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px]">
                <LoaderCircle className="size-3 animate-spin" />
                processing
              </Badge>
            ) : null}
          </div>
        </div>
        <TransferQueueSummary
          failedCount={failedItems.length}
          recentCompletedBytes={recentCompletedBytes}
          recentCompletedItems={recentCompletedItems}
          detailsExpanded={detailsExpanded}
          onToggleDetails={() => setDetailsExpanded((current) => !current)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {detailsExpanded && failedItems.length > 0 ? (
          <TransferQueueFailureDetails items={failedItems} />
        ) : null}
        {props.snapshot.items.length === 0 ? (
          <div className="flex h-full min-h-[5rem] items-center justify-center px-6 text-sm text-muted-foreground">
            아직 전송 작업이 없습니다.
          </div>
        ) : (
              <div className="min-w-0">
                {visibleItems.map((item) => (
              <TransferQueueRow
                key={item.id}
                disabled={props.mutationPending}
                item={item}
                onCancel={() => props.onCancel(item.id)}
                onPause={() => props.onPause(item.id)}
                onRetry={() => props.onRetry(item.id)}
              />
            ))}
            {props.snapshot.items.length > visibleItems.length ? (
                <p className="px-3 py-1 text-[10px] text-muted-foreground">
                  나머지 {props.snapshot.items.length - visibleItems.length}개 항목은 큐에 유지됩니다.
                </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function TransferQueueSummary(props: {
  failedCount: number;
  recentCompletedBytes: number;
  recentCompletedItems: SftpTransferQueueItem[];
  detailsExpanded: boolean;
  onToggleDetails: () => void;
}) {
  if (props.failedCount === 0 && props.recentCompletedItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1 border-t border-border/60 pt-0.5">
      {props.recentCompletedItems.length > 0 ? (
        <div className="flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700">
          <CheckCircle2 className="size-3" />
          <span>
            최근 완료 {props.recentCompletedItems.length}건
            {props.recentCompletedBytes > 0 ? ` · ${formatCopiedBytes(props.recentCompletedBytes)}` : ""}
          </span>
        </div>
      ) : null}
      {props.failedCount > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-5 gap-1 px-1.5 text-[10px]"
          onClick={props.onToggleDetails}
        >
          <AlertTriangle className="size-3 text-destructive" />
          실패 {props.failedCount}건
          <ChevronDown
            className={cn("size-3 transition-transform", props.detailsExpanded && "rotate-180")}
          />
        </Button>
      ) : null}
    </div>
  );
}

function TransferQueueFailureDetails(props: {
  items: SftpTransferQueueItem[];
}) {
  return (
    <div className="border-b border-border/60 bg-destructive/5 px-3 py-1">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive">
        Failure Details
      </p>
      <div className="space-y-1">
        {props.items.map((item) => (
          <div
            key={item.id}
            className="rounded-md border border-destructive/15 bg-background px-2 py-1"
          >
            <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
              <AlertTriangle className="size-3 text-destructive" />
              <span className="truncate">{item.label}</span>
              <Badge variant="outline" className="ml-auto h-5 px-1.5 text-[9px]">
                attempt {item.attempt_count}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={item.source_path}>
              {item.source_path}
            </p>
            {item.error_message ? (
              <p
                className="mt-0.5 whitespace-pre-wrap break-words text-[10px] text-destructive"
                title={item.error_message}
              >
                {item.error_message}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConcurrencyControl(props: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-1 py-0.5">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={props.disabled || props.value <= 1}
        aria-label="동시 전송 수 감소"
        onClick={() => props.onChange(props.value - 1)}
      >
        <span className="text-sm font-semibold">-</span>
      </Button>
      <span className="min-w-12 text-center text-[10px] font-medium text-foreground">
        {props.value} parallel
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={props.disabled || props.value >= 4}
        aria-label="동시 전송 수 증가"
        onClick={() => props.onChange(props.value + 1)}
      >
        <span className="text-sm font-semibold">+</span>
      </Button>
    </div>
  );
}

function TransferQueueRow(props: {
  item: SftpTransferQueueItem;
  disabled: boolean;
  onPause: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="grid grid-cols-[minmax(6.5rem,0.95fr)_minmax(9rem,2.4fr)_minmax(5.5rem,0.8fr)_3.6rem] items-center gap-1 border-b border-border/60 px-3 py-0.5 text-[10px]">
      <div className="flex min-w-0 items-center gap-1.5">
        {props.item.direction === "upload" ? (
          <ArrowUpFromLine className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ArrowDownToLine className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-[10px] font-medium text-foreground" title={props.item.label}>
          {props.item.label}
        </span>
        {props.item.recursive ? (
          <Badge variant="outline" className="shrink-0 h-4 px-1 py-0 text-[9px]">
            recursive
          </Badge>
        ) : null}
      </div>
      <div
        className="truncate text-[10px] text-muted-foreground"
        title={`${props.item.source_path} -> ${props.item.destination_path}`}
      >
        {props.item.source_path} {"->"} {props.item.destination_path}
      </div>
      <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
        <Badge
          variant="outline"
          className={cn(
            "h-4 px-1",
            props.item.status === "failed" && "border-destructive/40 text-destructive",
            props.item.status === "succeeded" && "border-emerald-300/50 text-emerald-700",
            props.item.status === "paused" && "border-amber-300/50 text-amber-700",
            props.item.status === "cancelled" && "border-muted-foreground/30 text-muted-foreground",
          )}
        >
          {props.item.status}
        </Badge>
        {props.item.copied_bytes !== null ? (
          <span>{formatCopiedBytes(props.item.copied_bytes)}</span>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-0.5">
        <TransferQueueActions {...props} />
      </div>
      {props.item.error_message ? (
        <div
          className="col-span-4 truncate text-[9px] text-destructive"
          title={props.item.error_message}
        >
          {props.item.error_message}
        </div>
      ) : null}
    </article>
  );
}

function TransferQueueActions(props: {
  item: SftpTransferQueueItem;
  disabled: boolean;
  onPause: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  if (props.item.status === "running") {
    return (
      <>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={props.disabled}
          aria-label="전송 일시 중지"
          onClick={props.onPause}
        >
          <Pause className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={props.disabled}
          aria-label="전송 취소"
          onClick={props.onCancel}
        >
          <X className="size-4" />
        </Button>
      </>
    );
  }

  if (props.item.status === "queued") {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={props.disabled}
        aria-label="전송 취소"
        onClick={props.onCancel}
      >
        <X className="size-4" />
      </Button>
    );
  }

  if (
    props.item.status === "paused" ||
    props.item.status === "failed" ||
    props.item.status === "cancelled"
  ) {
    return (
      <>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={props.disabled}
          aria-label="전송 재시도"
          onClick={props.onRetry}
        >
          <RotateCcw className="size-4" />
        </Button>
        {props.item.status !== "cancelled" ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={props.disabled}
            aria-label="전송 취소"
            onClick={props.onCancel}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </>
    );
  }

  return null;
}

function formatCopiedBytes(value: bigint | number) {
  const size = typeof value === "bigint" ? Number(value) : value;
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}
