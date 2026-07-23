import { useCallback } from "react";

export function useAppShellScrollReset(showHeader: (offset: number) => void) {
  return useCallback(() => {
    const forceTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      showHeader(0);
    };

    forceTop();
    requestAnimationFrame(() => {
      forceTop();
      requestAnimationFrame(() => {
        forceTop();
      });
    });
  }, [showHeader]);
}
