import { ArrowDownToLine, Copy, MoveRight, Trash2, X } from "lucide-react";
import { Button } from "../../components/ui/button";

export function SiteSftpSelectionToolbar(props: {
  count: number;
  onClear: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onMove: () => void;
}) {
  if (props.count === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/70 bg-muted/25 px-3 py-1">
      <div className="text-[11px] font-medium text-foreground">
        {props.count.toLocaleString("ko-KR")}개 선택됨
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px]" onClick={props.onDownload}>
          <ArrowDownToLine className="h-3.5 w-3.5" />
          다운로드
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px]" onClick={props.onCopy}>
          <Copy className="h-3.5 w-3.5" />
          복사
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px]" onClick={props.onMove}>
          <MoveRight className="h-3.5 w-3.5" />
          이동
        </Button>
        <Button type="button" size="sm" variant="destructive" className="h-7 gap-1 px-2 text-[10px]" onClick={props.onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          삭제
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="선택 해제" onClick={props.onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
