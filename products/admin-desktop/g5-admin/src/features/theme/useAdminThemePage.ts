import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdminTheme,
  getAdminThemeConfig,
  getAdminThemeList,
  updateAdminThemeConfig,
  type CommandError,
} from "../../api/client";
import type { AdminTheme } from "../../types/AdminTheme";
import type { AdminThemeConfig } from "../../types/AdminThemeConfig";
import type { AdminThemeConfigResponse } from "../../types/AdminThemeConfigResponse";
import type { AdminThemeConfigUpdateInput } from "../../types/AdminThemeConfigUpdateInput";
import type { AdminThemeDetailResponse } from "../../types/AdminThemeDetailResponse";
import type { AdminThemeListResponse } from "../../types/AdminThemeListResponse";
import {
  adminThemeConfigSchema,
  buildAdminThemeConfigPatch,
  buildAdminThemeConfigUpdateInput,
  emptyAdminThemeConfigFormValues,
  toAdminThemeConfigFormValues,
  type AdminThemeConfigFormValues,
} from "./admin-theme-form";

const themeConfigKey = ["admin", "theme", "config"] as const;
const themeListKey = ["admin", "theme", "list"] as const;

export function useAdminThemePage() {
  const queryClient = useQueryClient();
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  const configQuery = useQuery<AdminThemeConfigResponse, CommandError>({
    queryKey: themeConfigKey,
    queryFn: getAdminThemeConfig,
    retry: false,
  });
  const themesQuery = useQuery<AdminThemeListResponse, CommandError>({
    queryKey: themeListKey,
    queryFn: getAdminThemeList,
    retry: false,
  });

  const form = useForm<AdminThemeConfigFormValues>({
    defaultValues: emptyAdminThemeConfigFormValues,
    resolver: zodResolver(adminThemeConfigSchema),
  });

  useEffect(() => {
    if (!configQuery.data) {
      return;
    }

    form.reset(toAdminThemeConfigFormValues(configQuery.data.config));
  }, [configQuery.data, form]);

  useEffect(() => {
    const themes = themesQuery.data?.themes ?? [];
    if (themes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Async theme list hydration must clear stale selection when the installed theme set is empty.
      setSelectedThemeId(null);
      return;
    }

    if (selectedThemeId && themes.some((theme) => theme.id === selectedThemeId)) {
      return;
    }

    const baseline = configQuery.data?.config ?? null;
    const nextSelectedId =
      selectPreferredThemeId(themes, baseline) ?? themes[0]?.id ?? null;
    setSelectedThemeId(nextSelectedId);
  }, [configQuery.data, selectedThemeId, themesQuery.data]);

  const themeDetailQuery = useQuery<AdminThemeDetailResponse, CommandError>({
    enabled: selectedThemeId !== null,
    queryKey: ["admin", "theme", "detail", selectedThemeId ?? ""],
    queryFn: () => getAdminTheme(selectedThemeId ?? ""),
    retry: false,
  });

  const updateMutation = useMutation<
    AdminThemeConfigResponse,
    CommandError,
    Partial<AdminThemeConfigUpdateInput>
  >({
    mutationFn: updateAdminThemeConfig,
    onSuccess: async (response) => {
      queryClient.setQueryData(themeConfigKey, response);
      form.reset(toAdminThemeConfigFormValues(response.config));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: themeListKey }),
        queryClient.invalidateQueries({ queryKey: ["admin", "theme", "detail"] }),
      ]);
      toast.success("테마 설정을 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const baseline = configQuery.data?.config ?? null;
  const themes = themesQuery.data?.themes ?? [];
  const selectedTheme =
    themeDetailQuery.data?.theme ??
    themes.find((theme) => theme.id === selectedThemeId) ??
    null;
  const currentThemeName = resolveThemeName(themes, baseline?.cf_theme ?? "");
  const currentMobileThemeName = resolveThemeName(
    themes,
    baseline?.cf_mobile_theme ?? "",
  );

  return {
    baseline,
    currentMobileThemeName,
    currentThemeName,
    detailLoading: themeDetailQuery.isLoading,
    error:
      updateMutation.error ??
      themeDetailQuery.error ??
      themesQuery.error ??
      configQuery.error ??
      null,
    form,
    installedCount:
      baseline?.installed_count ?? themesQuery.data?.total ?? themes.length,
    isBusy:
      configQuery.isLoading ||
      themesQuery.isLoading ||
      themeDetailQuery.isFetching ||
      updateMutation.isPending,
    saveConfig(values: AdminThemeConfigFormValues) {
      if (!baseline) {
        return;
      }

      const payload = buildAdminThemeConfigUpdateInput(values, baseline);
      if (!payload) {
        toast("변경된 테마 설정이 없습니다.");
        return;
      }

      updateMutation.mutate(payload);
    },
    selectedTheme,
    selectedThemeId,
    setSelectedThemeId,
    themeOptions: buildThemeOptions(themes),
    themes,
    total: themesQuery.data?.total ?? themes.length,
    applyDesktopTheme() {
      if (!baseline || !selectedTheme) {
        return;
      }

      const payload = buildAdminThemeConfigPatch(baseline, {
        cf_theme: selectedTheme.id,
      });
      if (!payload) {
        toast("이미 현재 PC 테마로 적용되어 있습니다.");
        return;
      }

      updateMutation.mutate(payload);
    },
    applyMobileTheme() {
      if (!baseline || !selectedTheme) {
        return;
      }

      const payload = buildAdminThemeConfigPatch(baseline, {
        cf_mobile_theme: selectedTheme.id,
      });
      if (!payload) {
        toast("이미 현재 모바일 테마로 적용되어 있습니다.");
        return;
      }

      updateMutation.mutate(payload);
    },
    applyThemeEverywhere() {
      if (!baseline || !selectedTheme) {
        return;
      }

      const payload = buildAdminThemeConfigPatch(baseline, {
        cf_mobile_theme: selectedTheme.id,
        cf_theme: selectedTheme.id,
      });
      if (!payload) {
        toast("이미 PC/모바일 모두 현재 테마로 적용되어 있습니다.");
        return;
      }

      updateMutation.mutate(payload);
    },
    resetConfigForm() {
      form.reset(toAdminThemeConfigFormValues(baseline));
    },
  };
}

function buildThemeOptions(themes: AdminTheme[]) {
  return [
    { label: "사용 안 함", value: "" },
    ...themes.map((theme) => ({
      label: `${theme.theme_name} (${theme.id})`,
      value: theme.id,
    })),
  ];
}

function resolveThemeName(themes: AdminTheme[], themeId: string) {
  const normalizedThemeId = themeId.trim();
  if (normalizedThemeId.length === 0) {
    return "사용 안 함";
  }

  const theme = themes.find((item) => item.id === normalizedThemeId);
  return theme ? `${theme.theme_name} (${theme.id})` : normalizedThemeId;
}

function selectPreferredThemeId(
  themes: AdminTheme[],
  baseline: AdminThemeConfig | null,
) {
  if (!baseline) {
    return null;
  }

  const candidates = [baseline.cf_theme, baseline.cf_mobile_theme]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  for (const candidate of candidates) {
    if (themes.some((theme) => theme.id === candidate)) {
      return candidate;
    }
  }

  return null;
}
