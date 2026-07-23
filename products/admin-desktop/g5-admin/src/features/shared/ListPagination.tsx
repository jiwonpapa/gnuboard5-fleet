import { Button } from "../../components/ui/button";

export function ListPagination(props: {
  hasNext: boolean;
  hasPrev: boolean;
  isBusy: boolean;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  total: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        page {props.page} / {props.totalPages} · total {props.total}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={props.isBusy || !props.hasPrev}
          onClick={props.onPrev}
        >
          이전
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={props.isBusy || !props.hasNext}
          onClick={props.onNext}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
