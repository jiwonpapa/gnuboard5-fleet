import { Monitor, MonitorSmartphone, Palette, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import type { AdminTheme } from "../../types/AdminTheme";
import type { AdminThemeConfig } from "../../types/AdminThemeConfig";
import { SelectInputControlField } from "../admin/shared/AdminFormFields";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
} from "../schema/useAdminFieldSchema";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";
import type { AdminThemeConfigFormValues } from "./admin-theme-form";

export function ThemeWorkspace(props: {
  baseline: AdminThemeConfig | null;
  children?: ReactNode;
  detailLoading: boolean;
  fieldSchema: AdminSchemaDetail | null;
  form: UseFormReturn<AdminThemeConfigFormValues>;
  isBusy: boolean;
  onApplyDesktopTheme: () => void;
  onApplyMobileTheme: () => void;
  onApplyThemeEverywhere: () => void;
  onResetConfigForm: () => void;
  onSubmitConfig: (values: AdminThemeConfigFormValues) => void;
  selectedTheme: AdminTheme | null;
  themeOptions: Array<{ label: string; value: string }>;
}) {
  const theme = props.selectedTheme;
  const configOptions = resolveThemeOptions(
    props.fieldSchema,
    "cf_theme",
    props.themeOptions,
  );
  const mobileConfigOptions = resolveThemeOptions(
    props.fieldSchema,
    "cf_mobile_theme",
    props.themeOptions,
  );
  const configLabel = getFieldLabel(props.fieldSchema, "cf_theme", "PC 기본 테마");
  const mobileConfigLabel = getFieldLabel(
    props.fieldSchema,
    "cf_mobile_theme",
    "모바일 기본 테마",
  );
  const configDescription = getFieldDescription(props.fieldSchema, "cf_theme");
  const mobileConfigDescription = getFieldDescription(
    props.fieldSchema,
    "cf_mobile_theme",
  );

  return (
    <div className="space-y-6">
      {props.children}
      <Card>
        <CardHeader>
          <CardTitle>현재 적용 테마</CardTitle>
          <CardDescription>
            PC와 모바일 기본 테마를 선택해 `/admin/system/theme` 단일 리소스로
            저장합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            className="space-y-5"
            onSubmit={props.form.handleSubmit(props.onSubmitConfig)}
          >
            <div className="grid gap-4">
              <SelectInputControlField
                control={props.form.control}
                description={configDescription}
                disabled={props.isBusy}
                label={configLabel}
                name="cf_theme"
                options={configOptions}
              />
              <SelectInputControlField
                control={props.form.control}
                description={mobileConfigDescription}
                disabled={props.isBusy}
                label={mobileConfigLabel}
                name="cf_mobile_theme"
                options={mobileConfigOptions}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={props.isBusy || !props.baseline}>
                저장
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={props.isBusy || !props.baseline}
                onClick={props.onResetConfigForm}
              >
                원복
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {theme ? (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{theme.id}</Badge>
                  {theme.is_active ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-900">
                      PC 적용 중
                    </Badge>
                  ) : null}
                  {theme.is_mobile_active ? (
                    <Badge variant="secondary" className="bg-sky-100 text-sky-900">
                      모바일 적용 중
                    </Badge>
                  ) : null}
                  {theme.set_default_skin ? (
                    <Badge variant="outline">기본 스킨 포함</Badge>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <CardTitle className="break-words">{theme.theme_name}</CardTitle>
                  <CardDescription className="leading-6 break-words">
                    {theme.detail ?? "테마 설명이 없습니다."}
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.isBusy || theme.is_active}
                  onClick={props.onApplyDesktopTheme}
                >
                  <Monitor className="h-4 w-4" />
                  PC 적용
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.isBusy || theme.is_mobile_active}
                  onClick={props.onApplyMobileTheme}
                >
                  <MonitorSmartphone className="h-4 w-4" />
                  모바일 적용
                </Button>
                <Button
                  type="button"
                  disabled={
                    props.isBusy || (theme.is_active && theme.is_mobile_active)
                  }
                  onClick={props.onApplyThemeEverywhere}
                >
                  <Sparkles className="h-4 w-4" />
                  둘 다 적용
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <MetaCard label="버전" value={theme.version} />
              <MetaCard label="제작자" value={theme.maker} />
              <MetaCard label="테마 URI" value={theme.theme_uri} />
              <MetaCard label="제작자 URI" value={theme.maker_uri} />
              <MetaCard label="라이선스" value={theme.license} />
              <MetaCard label="라이선스 URI" value={theme.license_uri} />
              <MetaCard label="미리보기 게시판 스킨" value={theme.preview_board_skin} />
              <MetaCard
                label="모바일 미리보기 스킨"
                value={theme.preview_mobile_board_skin}
              />
            </div>

            <Separator />

            <div className="grid gap-3">
              <MetaCard label="테마 경로" value={theme.path} />
              <MetaCard label="README 경로" value={theme.readme_path} />
              <MetaCard label="테마 설정 경로" value={theme.theme_config_path} />
              <MetaCard label="스크린샷 경로" value={theme.screenshot_path} />
            </div>
          </CardContent>
        </Card>
      ) : props.detailLoading ? (
        <SelectionPlaceholder description="테마 상세를 불러오는 중입니다." />
      ) : (
        <SelectionPlaceholder description="좌측 목록에서 테마를 선택하면 상세와 빠른 적용 버튼이 여기에 표시됩니다." />
      )}
    </div>
  );
}

function resolveThemeOptions(
  fieldSchema: AdminSchemaDetail | null,
  name: "cf_theme" | "cf_mobile_theme",
  fallback: Array<{ label: string; value: string }>,
) {
  const options = getFieldOptions(fieldSchema, name);
  return options.length > 0 ? options : fallback;
}

function MetaCard(props: { label: string; value: string | null | undefined }) {
  return (
    <article className="rounded-[1.15rem] border border-border/70 bg-background/85 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {props.label}
      </p>
      <div className="mt-2 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary/10 text-primary">
          <Palette className="h-4 w-4" />
        </div>
        <strong className="block break-words text-sm font-semibold text-foreground">
          {props.value && props.value.trim().length > 0 ? props.value : "-"}
        </strong>
      </div>
    </article>
  );
}
