import { Monitor, MonitorSmartphone, Palette } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { AdminDataTable } from "../admin/shared/AdminDataTable";
import { PageIntro } from "../layout/PageIntro";
import { FieldSchemaStatePanel } from "../schema/FieldSchemaStatePanel";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import { ErrorBanner } from "../shared/ErrorBanner";
import { ThemeWorkspace } from "./ThemeWorkspace";
import { useAdminThemePage } from "./useAdminThemePage";

export function AdminThemePage() {
  const page = useAdminThemePage();
  const themeSchemaQuery = useAdminFieldSchema("theme");
  const themeSchema = themeSchemaQuery.data?.schema ?? null;
  const showSchemaState = hasFieldSchemaState({
    error: themeSchemaQuery.error ?? null,
    loading: themeSchemaQuery.isLoading,
    schema: themeSchema,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(400px,0.98fr)]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin Theme"
          title="테마 설정"
          description="`/admin/system/theme`, `/admin/system/themes`, `/admin/system/themes/{theme}`를 route-native 작업면으로 묶었습니다. 현재 적용 테마와 설치된 테마 메타데이터를 같은 화면에서 확인하고 바로 반영합니다."
          icon={Palette}
          metrics={[
            {
              hint: "설치된 시스템 테마 수",
              icon: Palette,
              label: "설치 테마",
              value: String(page.installedCount),
            },
            {
              hint: "현재 PC 기본 테마",
              icon: Monitor,
              label: "PC 기본",
              value: page.currentThemeName,
            },
            {
              hint: "현재 모바일 기본 테마",
              icon: MonitorSmartphone,
              label: "모바일 기본",
              value: page.currentMobileThemeName,
            },
          ]}
        />

        {page.error ? <ErrorBanner error={page.error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>설치된 테마 목록</CardTitle>
            <CardDescription>
              레거시 `adm/theme.php` 기준 설치된 테마를 모두 표시합니다. 목록에서 선택한
              테마의 메타데이터와 빠른 적용 버튼은 우측 작업면에 고정됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminDataTable
              columns={[
                {
                  header: "테마",
                  render: (theme) => (
                    <div className="min-w-0 space-y-1">
                      <strong className="block text-sm font-semibold text-foreground">
                        {theme.theme_name}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {theme.id}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "제작/버전",
                  render: (theme) => (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>{theme.maker ?? "제작자 정보 없음"}</p>
                      <p>{theme.version ?? "버전 정보 없음"}</p>
                    </div>
                  ),
                },
                {
                  header: "상태",
                  render: (theme) => (
                    <div className="flex flex-wrap gap-2">
                      {theme.is_active ? (
                        <Badge
                          variant="secondary"
                          className="w-fit bg-emerald-100 text-emerald-900"
                        >
                          PC
                        </Badge>
                      ) : null}
                      {theme.is_mobile_active ? (
                        <Badge
                          variant="secondary"
                          className="w-fit bg-sky-100 text-sky-900"
                        >
                          모바일
                        </Badge>
                      ) : null}
                      {theme.set_default_skin ? (
                        <Badge variant="outline" className="w-fit">
                          기본 스킨
                        </Badge>
                      ) : null}
                      {!theme.is_active &&
                      !theme.is_mobile_active &&
                      !theme.set_default_skin ? (
                        <span className="text-xs text-muted-foreground">대기</span>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              emptyMessage="설치된 테마가 없습니다."
              getRowKey={(theme) => theme.id}
              onRowClick={(theme) => page.setSelectedThemeId(theme.id)}
              rows={page.themes}
              selectedKey={page.selectedThemeId}
            />

            <p className="text-sm text-muted-foreground">
              total {page.total} themes
            </p>
          </CardContent>
        </Card>
      </div>

      <ThemeWorkspace
        baseline={page.baseline}
        detailLoading={page.detailLoading}
        fieldSchema={themeSchema}
        form={page.form}
        isBusy={page.isBusy}
        onApplyDesktopTheme={page.applyDesktopTheme}
        onApplyMobileTheme={page.applyMobileTheme}
        onApplyThemeEverywhere={page.applyThemeEverywhere}
        onResetConfigForm={page.resetConfigForm}
        onSubmitConfig={page.saveConfig}
        selectedTheme={page.selectedTheme}
        themeOptions={page.themeOptions}
      >
        {showSchemaState ? (
          <FieldSchemaStatePanel
            error={themeSchemaQuery.error ?? null}
            hiddenTargetLabel="테마 설정 작업면"
            loading={themeSchemaQuery.isLoading}
            noun="테마 설정"
            schema={themeSchema}
          />
        ) : null}
      </ThemeWorkspace>
    </div>
  );
}
