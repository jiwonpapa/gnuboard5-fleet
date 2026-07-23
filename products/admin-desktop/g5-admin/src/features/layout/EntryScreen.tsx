import type { ReactNode } from "react";
import { APP_DISPLAY_NAME } from "./branding";

export function EntryScreen(props: {
  children: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-6 transition-colors">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center">
        <div className="w-full space-y-5">
          <section className="space-y-2">
            <p className="text-[1.12rem] font-semibold tracking-tight text-foreground">
              {APP_DISPLAY_NAME}
            </p>
            <h1 className="max-w-2xl text-[2.32rem] leading-tight font-semibold tracking-tight text-foreground md:text-[2.58rem]">
              {props.title}
            </h1>
            {props.description ? (
              <p className="max-w-2xl text-[1.06rem] leading-7 text-muted-foreground">
                {props.description}
              </p>
            ) : null}
          </section>

          {props.children}
        </div>
      </div>
    </div>
  );
}
