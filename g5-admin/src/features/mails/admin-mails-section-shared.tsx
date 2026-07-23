import { Button } from "../../components/ui/button";

export function Pager(props: {
  currentPage: number;
  disabled: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">현재 페이지 {props.currentPage}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.disabled || !props.hasPrev}
          onClick={props.onPrev}
        >
          이전
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.disabled || !props.hasNext}
          onClick={props.onNext}
        >
          다음
        </Button>
      </div>
    </div>
  );
}

export function SummaryField(props: { label: string; monospace?: boolean; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </p>
      <p
        className={[
          "mt-2 break-words text-sm leading-6 text-foreground",
          props.monospace === false ? "" : "font-mono",
        ].join(" ")}
      >
        {props.value}
      </p>
    </div>
  );
}
