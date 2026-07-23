import {
  AlertTriangle,
  Clock3,
  ListTodo,
  Power,
  Terminal,
} from "lucide-react";
import { cn } from "../lib/utils";
import { SummaryChip } from "./DebugDockComponents";

export function DebugDockCompact(props: {
  enabled: boolean;
  entriesCount: number;
  errorCount: number;
  expanded: boolean;
  pendingCount: number;
  setEnabled: (updater: (current: boolean) => boolean) => void;
  setExpanded: (updater: (current: boolean) => boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="flex h-8 items-center gap-1 rounded-[0.85rem] bg-background/94 px-1 text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          if (props.enabled) {
            props.setExpanded(() => true);
          }
        }}
        disabled={!props.enabled}
        aria-expanded={props.expanded}
        aria-label={props.enabled ? "디버그 독 열기" : "디버그 독 비활성화됨"}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.8rem] bg-primary/10 text-primary">
          <Terminal className="h-3.5 w-3.5" />
        </span>
        <SummaryChip
          compact
          icon={<Clock3 className="h-3.5 w-3.5" />}
          label="pending"
          tone="pending"
          value={props.pendingCount}
        />
        <SummaryChip
          compact
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="error"
          tone="error"
          value={props.errorCount}
        />
        <SummaryChip
          compact
          icon={<ListTodo className="h-3.5 w-3.5" />}
          label="total"
          tone="total"
          value={props.entriesCount}
        />
      </button>

      <button
        type="button"
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] border transition-colors",
          props.enabled
            ? "border-primary/20 bg-primary/10 text-primary"
            : "border-border/70 bg-background text-muted-foreground",
        )}
        onClick={() => {
          props.setEnabled((current) => {
            const next = !current;
            if (!next) {
              props.setExpanded(() => false);
            }
            return next;
          });
        }}
        aria-pressed={props.enabled}
        aria-label={props.enabled ? "디버그 독 끄기" : "디버그 독 켜기"}
      >
        <Power className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
