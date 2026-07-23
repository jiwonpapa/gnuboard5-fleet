import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Download,
  HardDrive,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Search,
  Server,
  Trash2,
  Upload,
} from "lucide-react";
import { type ReactNode } from "react";
import { type healthCheckSite } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";
import type { SiteCatalogEntry } from "../../types/SiteCatalogEntry";
import { APP_DISPLAY_NAME } from "../layout/branding";
import { PageIntro } from "../layout/PageIntro";
import { findSiteName } from "./site-dashboard-helpers";

type BackupPending = null | "export" | "import" | "lock";

type SiteHealthQuery =
  | {
      data?: Awaited<ReturnType<typeof healthCheckSite>>;
      error?: unknown;
      isLoading: boolean;
    }
  | undefined;

export function SiteDashboardLoadingState() {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <Card className="w-full shadow-xl">
          <CardHeader>
            <CardTitle>사이트 목록을 불러오는 중입니다.</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            등록된 사이트와 활성 상태를 확인하고 있습니다.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SiteDashboardContent(props: {
  activeSiteId: string | undefined;
  backupPending: BackupPending;
  embedded?: boolean;
  filteredSites: SiteCatalogEntry[];
  healthQueries: SiteHealthQuery[];
  onAddSite: () => void;
  onBackupExport: () => void;
  onBackupImport: () => void;
  onDeleteSite: (entry: SiteCatalogEntry) => void;
  onLock: () => void;
  onOpenFiles: (siteId: string) => void;
  onOpenSsh: (siteId: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectSite: (siteId: string) => void;
  searchQuery: string;
  sites: SiteCatalogEntry[];
}) {
  const actionButtons = (
    <SiteActionButtons
      backupPending={props.backupPending}
      onAddSite={props.onAddSite}
      onBackupExport={props.onBackupExport}
      onBackupImport={props.onBackupImport}
      onLock={props.onLock}
    />
  );

  return (
    <div
      className={
        props.embedded
          ? "space-y-5"
          : "min-h-screen bg-background px-4 py-8 transition-colors"
      }
    >
      <div className={props.embedded ? "space-y-5" : "mx-auto max-w-6xl space-y-6"}>
        {props.embedded ? (
          <PageIntro
            kicker={APP_DISPLAY_NAME}
            title="사이트관리"
            description="등록 사이트, 백업/복구, 활성 사이트 전환을 같은 작업면에서 관리합니다."
            icon={HardDrive}
            actions={<div className="flex flex-wrap gap-2">{actionButtons}</div>}
            metrics={[
              {
                label: "등록 사이트",
                value: String(props.sites.length),
                hint: "현재 로컬 앱에 저장된 사이트 수",
                icon: HardDrive,
              },
              {
                label: "활성 사이트",
                value: props.activeSiteId
                  ? findSiteName(props.sites, props.activeSiteId)
                  : "없음",
                hint: "현재 선택된 사이트",
                icon: ArrowRight,
              },
            ]}
          />
        ) : (
          <SiteDashboardCardHeader
            actions={actionButtons}
            activeSiteId={props.activeSiteId}
            sites={props.sites}
          />
        )}

        <SiteSearchCard
          searchQuery={props.searchQuery}
          onSearchQueryChange={props.onSearchQueryChange}
        />

        <SiteCardList
          activeSiteId={props.activeSiteId}
          filteredSites={props.filteredSites}
          healthQueries={props.healthQueries}
          onDeleteSite={props.onDeleteSite}
          onOpenFiles={props.onOpenFiles}
          onOpenSsh={props.onOpenSsh}
          onSelectSite={props.onSelectSite}
          sites={props.sites}
        />
      </div>
    </div>
  );
}

function SiteDashboardCardHeader(props: {
  actions: ReactNode;
  activeSiteId: string | undefined;
  sites: SiteCatalogEntry[];
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="space-y-2">
        <CardTitle className="text-[1.45rem]">사이트 목록</CardTitle>
        <CardDescription className="text-[0.98rem] leading-7">
          등록된 사이트를 선택하거나 새 사이트를 추가하십시오.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">등록 {props.sites.length}개</Badge>
          {props.activeSiteId ? (
            <Badge variant="outline">
              현재 선택 {findSiteName(props.sites, props.activeSiteId)}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">{props.actions}</div>
      </CardContent>
    </Card>
  );
}

function SiteSearchCard(props: {
  onSearchQueryChange: (value: string) => void;
  searchQuery: string;
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardContent className="p-4">
        <InputGroup className="h-10 rounded-sm border-border bg-background">
          <InputGroupAddon className="pl-3 pr-0">
            <InputGroupText>
              <Search className="h-4 w-4 text-muted-foreground" />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            value={props.searchQuery}
            placeholder="사이트 이름 또는 API 주소 검색"
            onChange={(event) => props.onSearchQueryChange(event.currentTarget.value)}
          />
        </InputGroup>
      </CardContent>
    </Card>
  );
}

function SiteCardList(props: {
  activeSiteId: string | undefined;
  filteredSites: SiteCatalogEntry[];
  healthQueries: SiteHealthQuery[];
  onDeleteSite: (entry: SiteCatalogEntry) => void;
  onOpenFiles: (siteId: string) => void;
  onOpenSsh: (siteId: string) => void;
  onSelectSite: (siteId: string) => void;
  sites: SiteCatalogEntry[];
}) {
  return (
    <section className="space-y-4">
      {props.filteredSites.length > 0 ? (
        props.filteredSites.map((entry) => {
          const healthQuery =
            props.healthQueries[
              props.sites.findIndex((site) => site.site.id === entry.site.id)
            ];

          return (
            <Card
              key={entry.site.id}
              className="border-border/70 bg-card transition-colors hover:border-primary/25 hover:bg-muted/10"
            >
              <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-lg font-semibold text-foreground">
                      {entry.site.name}
                    </strong>
                    {entry.site.is_default ? (
                      <Badge variant="outline">기본 사이트</Badge>
                    ) : null}
                    {props.activeSiteId === entry.site.id ? (
                      <Badge variant="secondary">현재 선택</Badge>
                    ) : null}
                    <Badge
                      variant={entry.status === "authenticated" ? "secondary" : "outline"}
                      className={
                        entry.status === "authenticated"
                          ? "bg-emerald-100 text-emerald-900"
                          : "border-slate-300 bg-slate-50 text-slate-700"
                      }
                    >
                      {entry.status === "authenticated" ? "로그인됨" : "로그인 필요"}
                    </Badge>
                    <SiteHealthBadge healthQuery={healthQuery} />
                  </div>

                  <div className="space-y-2">
                    <p className="break-all text-sm leading-6 text-muted-foreground">
                      {entry.site.api_base_url}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>등록일 {entry.site.created_at}</span>
                      <span>갱신 {entry.site.updated_at}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    aria-label={`${entry.site.name} 접속`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onSelectSite(entry.site.id);
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                    접속
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onOpenFiles(entry.site.id);
                    }}
                  >
                    <HardDrive className="h-4 w-4" />
                    SFTP
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onOpenSsh(entry.site.id);
                    }}
                  >
                    <Server className="h-4 w-4" />
                    SSH
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onDeleteSite(entry);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card className="border-border/70 bg-card/96 shadow-sm">
          <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
            검색 조건에 맞는 사이트가 없습니다.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function SiteActionButtons(props: {
  backupPending: BackupPending;
  onAddSite: () => void;
  onBackupExport: () => void;
  onBackupImport: () => void;
  onLock: () => void;
}) {
  return (
    <>
      <ActionButton
        disabled={props.backupPending !== null}
        icon={Download}
        isPending={props.backupPending === "export"}
        label="휴대용 백업 내보내기"
        onClick={props.onBackupExport}
        variant="outline"
      />
      <ActionButton
        disabled={props.backupPending !== null}
        icon={Upload}
        isPending={props.backupPending === "import"}
        label="백업 가져오기"
        onClick={props.onBackupImport}
        variant="outline"
      />
      <ActionButton
        disabled={props.backupPending !== null}
        icon={LockKeyhole}
        isPending={props.backupPending === "lock"}
        label="앱 잠금"
        onClick={props.onLock}
        variant="outline"
      />
      <ActionButton icon={Plus} label="사이트 추가" onClick={props.onAddSite} />
    </>
  );
}

function ActionButton(props: {
  disabled?: boolean;
  icon: LucideIcon;
  isPending?: boolean;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      type="button"
      variant={props.variant}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.isPending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <props.icon className="h-4 w-4" />
      )}
      {props.label}
    </Button>
  );
}

function SiteHealthBadge(props: { healthQuery: SiteHealthQuery }) {
  if (!props.healthQuery || props.healthQuery.isLoading) {
    return <Badge variant="outline">상태 확인 중</Badge>;
  }

  if (props.healthQuery.error || props.healthQuery.data?.reachable === false) {
    return (
      <Badge className="border-rose-300 bg-rose-50 text-rose-800" variant="outline">
        연결 장애
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-100 text-emerald-900" variant="secondary">
      API 정상
    </Badge>
  );
}
