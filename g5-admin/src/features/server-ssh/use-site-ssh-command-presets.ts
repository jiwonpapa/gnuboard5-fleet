import { useCallback, useMemo, useState } from "react";

export type SiteSshCommandPreset = {
  command: string;
  label: string;
  slot: number;
};

const PRESET_COUNT = 10;

export function useSiteSshCommandPresets(siteId: string) {
  const [presets, setPresets] = useState<SiteSshCommandPreset[]>(() =>
    loadCommandPresets(siteId),
  );

  const populatedPresets = useMemo(
    () => presets.filter((preset) => preset.command.trim().length > 0),
    [presets],
  );

  const updatePreset = useCallback(
    (slot: number, next: Pick<SiteSshCommandPreset, "command" | "label">) => {
      setPresets((current) => {
        const updated = current.map((preset) =>
          preset.slot === slot
            ? {
                ...preset,
                command: next.command,
                label: next.label,
              }
            : preset,
        );
        saveCommandPresets(siteId, updated);
        return updated;
      });
    },
    [siteId],
  );

  const replacePresets = useCallback(
    (nextPresets: SiteSshCommandPreset[]) => {
      const normalized = buildNormalizedPresets(nextPresets);
      setPresets(normalized);
      saveCommandPresets(siteId, normalized);
    },
    [siteId],
  );

  return {
    populatedPresets,
    presets,
    replacePresets,
    updatePreset,
  };
}

function storageKey(siteId: string) {
  return `g5-admin:ssh-command-presets:${siteId}`;
}

function loadCommandPresets(siteId: string) {
  if (typeof window === "undefined") {
    return buildDefaultPresets();
  }

  try {
    const raw = window.localStorage.getItem(storageKey(siteId));
    if (!raw) {
      return buildDefaultPresets();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return buildDefaultPresets();
    }

    return buildNormalizedPresets(
      parsed.map((entry, index) => {
        const safeEntry = entry as Partial<SiteSshCommandPreset> | null;
        return {
          command:
            typeof safeEntry?.command === "string" ? safeEntry.command : "",
          label: typeof safeEntry?.label === "string" ? safeEntry.label : "",
          slot:
            typeof safeEntry?.slot === "number" ? safeEntry.slot : index + 1,
        };
      }),
    );
  } catch {
    return buildDefaultPresets();
  }
}

function saveCommandPresets(siteId: string, presets: SiteSshCommandPreset[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(siteId), JSON.stringify(presets));
}

function buildDefaultPresets() {
  return Array.from({ length: PRESET_COUNT }, (_, index) => ({
    command: "",
    label: "",
    slot: index + 1,
  }));
}

function buildNormalizedPresets(nextPresets: SiteSshCommandPreset[]) {
  const bySlot = new Map(nextPresets.map((preset) => [preset.slot, preset]));
  return Array.from({ length: PRESET_COUNT }, (_, index) => {
    const slot = index + 1;
    const preset = bySlot.get(slot);
    return {
      command: preset?.command ?? "",
      label: preset?.label ?? "",
      slot,
    };
  });
}
