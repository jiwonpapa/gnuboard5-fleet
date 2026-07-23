import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

const HEADER_HIDE_SCROLL_TOP = 100;
const HEADER_SHOW_SCROLL_DELTA = 20;

export function useHeaderVisibility() {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerElevated, setHeaderElevated] = useState(() =>
    typeof window !== "undefined" ? window.scrollY > 8 : false,
  );
  const lastScrollYRef = useRef(
    typeof window !== "undefined" ? window.scrollY : 0,
  );
  const scrollDownDistanceRef = useRef(0);
  const scrollUpDistanceRef = useRef(0);

  const showHeader = useCallback((scrollY = window.scrollY) => {
    lastScrollYRef.current = scrollY;
    scrollDownDistanceRef.current = 0;
    scrollUpDistanceRef.current = 0;
    setHeaderVisible(true);
    setHeaderElevated(scrollY > 8);
  }, []);

  const handleWindowScroll = useEffectEvent(() => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollYRef.current;
    lastScrollYRef.current = currentScrollY;
    setHeaderElevated(currentScrollY > 8);

    if (currentScrollY <= HEADER_HIDE_SCROLL_TOP) {
      scrollDownDistanceRef.current = 0;
      scrollUpDistanceRef.current = 0;
      setHeaderVisible(true);
      return;
    }

    if (delta > 0) {
      scrollDownDistanceRef.current += delta;
      scrollUpDistanceRef.current = 0;

      if (scrollDownDistanceRef.current >= HEADER_HIDE_SCROLL_TOP) {
        setHeaderVisible(false);
      }

      return;
    }

    if (delta < 0) {
      scrollUpDistanceRef.current += Math.abs(delta);
      scrollDownDistanceRef.current = 0;

      if (scrollUpDistanceRef.current >= HEADER_SHOW_SCROLL_DELTA) {
        setHeaderVisible(true);
      }
    }
  });

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    scrollDownDistanceRef.current = 0;
    scrollUpDistanceRef.current = 0;

    const listener = () => {
      handleWindowScroll();
    };

    window.addEventListener("scroll", listener, { passive: true });
    return () => {
      window.removeEventListener("scroll", listener);
    };
  }, [showHeader]);

  return {
    headerElevated,
    headerVisible,
    showHeader,
  };
}
