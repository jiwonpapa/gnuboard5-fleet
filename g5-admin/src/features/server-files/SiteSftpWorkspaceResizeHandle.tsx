import { GripHorizontal, GripVertical } from "lucide-react";
import { Separator } from "react-resizable-panels";
import { cn } from "../../lib/utils";

export function SiteSftpWorkspaceResizeHandle(props: {
  direction: "horizontal" | "vertical";
}) {
  const horizontal = props.direction === "horizontal";

  return (
    <Separator
      className={cn(
        "group relative flex shrink-0 items-center justify-center bg-transparent transition-colors",
        horizontal ? "w-3" : "h-3",
      )}
    >
      <div
        className={cn(
          "rounded-full bg-border/80 transition-colors group-data-[dragging]:bg-sky-500 group-hover:bg-sky-400/70",
          horizontal ? "h-16 w-1.5" : "h-1.5 w-16",
        )}
      />
      {horizontal ? (
        <GripVertical className="pointer-events-none absolute size-3 text-muted-foreground/70" />
      ) : (
        <GripHorizontal className="pointer-events-none absolute size-3 text-muted-foreground/70" />
      )}
    </Separator>
  );
}
