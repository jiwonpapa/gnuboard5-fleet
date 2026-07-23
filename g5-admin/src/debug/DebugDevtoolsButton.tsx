import { Braces } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { openDesktopDevtools } from "./devtools";

export function DebugDevtoolsButton(props: {
  className?: string;
  size?: "default" | "sm";
  variant?: "outline" | "secondary";
}) {
  const [pending, setPending] = useState(false);

  return (
    <div className={cn("space-y-1", props.className)}>
      <Button
        type="button"
        size={props.size ?? "sm"}
        variant={props.variant ?? "outline"}
        disabled={pending}
        onClick={() => {
          setPending(true);
          void openDesktopDevtools()
            .catch((error) => {
              toast.error(
                error instanceof Error ? error.message : "DOM 검사를 열지 못했습니다.",
              );
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <Braces className="h-4 w-4" />
        {pending ? "DOM 검사 여는 중..." : "DOM 검사 열기"}
      </Button>
      <p className="text-[0.72rem] text-muted-foreground">
        단축키: `F11` / `F12` / `Cmd+Opt+I` / `Ctrl+Shift+I`
      </p>
    </div>
  );
}
