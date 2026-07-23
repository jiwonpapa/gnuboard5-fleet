/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppTheme = "light" | "dark" | "system";
export type ResolvedAppTheme = "light" | "dark";
export type AppFontScale = "sm" | "md" | "lg";

type ThemeContextValue = {
  canDecreaseFontScale: boolean;
  canIncreaseFontScale: boolean;
  decreaseFontScale: () => void;
  devMode: boolean;
  fontScale: AppFontScale;
  increaseFontScale: () => void;
  resolvedTheme: ResolvedAppTheme;
  setDevMode: (enabled: boolean) => void;
  setFontScale: (fontScale: AppFontScale) => void;
  setTheme: (theme: AppTheme) => void;
  theme: AppTheme;
  toggleDevMode: () => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const defaultTheme: AppTheme = "system";
const defaultFontScale: AppFontScale = "md";
const defaultDevMode = import.meta.env.DEV;
export const themeStorageKey = "g5-admin-theme";
const fontScaleStorageKey = "g5-admin-font-scale";
export const devModeStorageKey = "g5-admin-dev-mode";
const fontScaleOrder: AppFontScale[] = ["sm", "md", "lg"];
const fontScalePxMap: Record<AppFontScale, number> = {
  sm: 14,
  md: 15,
  lg: 16,
};

export function ThemeProvider(props: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    const stored = readStoredTheme();
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return defaultTheme;
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedAppTheme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return readSystemTheme();
  });
  const [fontScale, setFontScaleState] = useState<AppFontScale>(() => {
    if (typeof window === "undefined") {
      return defaultFontScale;
    }

    const stored = readStoredFontScale();
    if (stored === "sm" || stored === "md" || stored === "lg") {
      return stored;
    }

    return defaultFontScale;
  });
  const [devMode, setDevModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return defaultDevMode;
    }

    const stored = readStoredDevMode();
    if (stored === "enabled" || stored === "disabled") {
      return stored === "enabled";
    }

    return defaultDevMode;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      setSystemTheme(media.matches ? "dark" : "light");
    };

    updateSystemTheme();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateSystemTheme);
      return () => media.removeEventListener("change", updateSystemTheme);
    }

    media.addListener(updateSystemTheme);
    return () => media.removeListener(updateSystemTheme);
  }, []);

  const resolvedTheme: ResolvedAppTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
    root.dataset.themeMode = theme;
    root.dataset.resolvedTheme = resolvedTheme;
    root.style.fontSize = `${fontScalePxMap[fontScale]}px`;
    root.dataset.devMode = devMode ? "on" : "off";
    writeStoredTheme(theme);
    writeStoredFontScale(fontScale);
    writeStoredDevMode(devMode);
  }, [devMode, fontScale, resolvedTheme, theme]);

  const value = useMemo(
    () => ({
      fontScale,
      devMode,
      setFontScale: (nextFontScale: AppFontScale) =>
        setFontScaleState(nextFontScale),
      setDevMode: (enabled: boolean) => setDevModeState(enabled),
      increaseFontScale: () =>
        setFontScaleState((currentFontScale) =>
          shiftFontScale(currentFontScale, 1),
        ),
      decreaseFontScale: () =>
        setFontScaleState((currentFontScale) =>
          shiftFontScale(currentFontScale, -1),
        ),
      canIncreaseFontScale: fontScale !== "lg",
      canDecreaseFontScale: fontScale !== "sm",
      resolvedTheme,
      theme,
      setTheme: (nextTheme: AppTheme) => setThemeState(nextTheme),
      toggleDevMode: () => setDevModeState((currentMode) => !currentMode),
      toggleTheme: () =>
        setThemeState((currentTheme) =>
          currentTheme === "light"
            ? "dark"
            : currentTheme === "dark"
              ? "system"
              : "light",
        ),
    }),
    [devMode, fontScale, resolvedTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

function readStoredTheme() {
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return null;
    }

    return storage.getItem(themeStorageKey);
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: AppTheme) {
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }

    storage.setItem(themeStorageKey, theme);
  } catch {
    // Ignore storage write failures in test or restricted runtime environments.
  }
}

function readSystemTheme(): ResolvedAppTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredFontScale() {
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return null;
    }

    return storage.getItem(fontScaleStorageKey);
  } catch {
    return null;
  }
}

function writeStoredFontScale(fontScale: AppFontScale) {
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }

    storage.setItem(fontScaleStorageKey, fontScale);
  } catch {
    // Ignore storage write failures in test or restricted runtime environments.
  }
}

function readStoredDevMode() {
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return null;
    }

    return storage.getItem(devModeStorageKey);
  } catch {
    return null;
  }
}

function writeStoredDevMode(enabled: boolean) {
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }

    storage.setItem(devModeStorageKey, enabled ? "enabled" : "disabled");
  } catch {
    // Ignore storage write failures in test or restricted runtime environments.
  }
}

function shiftFontScale(currentFontScale: AppFontScale, delta: -1 | 1) {
  const currentIndex = fontScaleOrder.indexOf(currentFontScale);
  const nextIndex = Math.min(
    Math.max(currentIndex + delta, 0),
    fontScaleOrder.length - 1,
  );

  return fontScaleOrder[nextIndex] ?? currentFontScale;
}
