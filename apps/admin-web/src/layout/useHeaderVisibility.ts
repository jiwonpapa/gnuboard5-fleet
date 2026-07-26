import { useEffect, useState } from "react";

export function useHeaderVisibility(threshold = 24): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let previous = globalThis.scrollY;
    const onScroll = () => {
      const current = globalThis.scrollY;
      setVisible(current < threshold || current <= previous);
      previous = current;
    };
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    return () => globalThis.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return visible;
}
