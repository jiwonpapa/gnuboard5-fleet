import { cn } from "../../lib/utils";

export function SelectionPlaceholder(props: {
  className?: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border border-dashed border-border bg-background/80 px-5 py-6 text-sm leading-6 text-muted-foreground",
        props.className,
      )}
    >
      {props.description}
    </div>
  );
}
