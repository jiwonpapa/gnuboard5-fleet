import { useMemo, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, Server } from "lucide-react";
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
import { ErrorBanner } from "../shared/ErrorBanner";
import { useSiteCatalog } from "./use-site-catalog";
import type { SiteCatalog } from "../../types/SiteCatalog";

export function SiteRegistrationForm(props: {
  compact?: boolean;
  description?: string;
  onRegistered?: (catalog: SiteCatalog) => void;
  submitLabel?: string;
  title?: string;
}) {
  const siteCatalog = useSiteCatalog();
  const [name, setName] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [lastResolvedUrl, setLastResolvedUrl] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => name.trim().length >= 2 && apiBaseUrl.trim().length >= 8,
    [apiBaseUrl, name],
  );

  async function runHealthCheck() {
    setLocalStatus(
      "연결을 확인하는 중입니다. 운영체제가 네트워크 접근이나 방화벽 허용을 묻는 경우 먼저 승인해 주십시오.",
    );
    setLastResolvedUrl(null);
    const result = await siteCatalog.healthCheckSite({
      api_base_url: apiBaseUrl.trim(),
    });
    setLocalStatus(result.message);
    setLastResolvedUrl(result.resolved_url ?? null);
    return result;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const health = await runHealthCheck();
    if (!health.reachable) {
      return;
    }

    const nextCatalog = await siteCatalog.addSite({
      api_base_url: health.resolved_url ?? apiBaseUrl.trim(),
      name: name.trim(),
    });
    setName("");
    setApiBaseUrl("");
    setLocalStatus("사이트 등록이 완료되었습니다.");
    props.onRegistered?.(nextCatalog);
  }

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className={props.compact ? "space-y-2" : "space-y-2"}>
        <CardTitle
          className={props.compact ? "text-[1.35rem]" : "text-[1.45rem]"}
        >
          {props.title ?? "사이트 등록"}
        </CardTitle>
        <CardDescription className="text-[1rem] leading-7">
          {props.description ??
            "관리할 G5 REST API 주소를 등록하면 사이트를 선택하고 바로 관리자 작업으로 들어갈 수 있습니다."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {siteCatalog.addSiteError ? (
          <ErrorBanner error={siteCatalog.addSiteError} />
        ) : null}
        {siteCatalog.healthCheckSiteError ? (
          <ErrorBanner error={siteCatalog.healthCheckSiteError} />
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              사이트 이름
            </span>
            <InputGroup className="h-12 rounded-sm border-border/70">
              <InputGroupAddon className="pl-3 pr-0">
                <InputGroupText>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                value={name}
                placeholder="예: 운영 쇼핑몰"
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </InputGroup>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              API 주소
            </span>
            <InputGroup className="h-12 rounded-sm border-border/70">
              <InputGroupAddon className="pl-3 pr-0">
                <InputGroupText>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                value={apiBaseUrl}
                placeholder="https://example.com/api/v1"
                onChange={(event) => setApiBaseUrl(event.currentTarget.value)}
                autoCapitalize="none"
                spellCheck={false}
              />
            </InputGroup>
          </label>

          {localStatus ? (
            <div className="rounded-sm border border-primary/15 bg-primary/[0.04] px-4 py-3 text-[0.97rem] text-muted-foreground">
              <p className="font-medium text-foreground">{localStatus}</p>
              {lastResolvedUrl ? (
                <p className="mt-1 break-all">확인된 주소: {lastResolvedUrl}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={!canSubmit || siteCatalog.healthCheckSitePending}
              onClick={() => {
                void runHealthCheck();
              }}
            >
              {siteCatalog.healthCheckSitePending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              연결 테스트
            </Button>
            <Button
              type="submit"
              disabled={
                !canSubmit ||
                siteCatalog.addSitePending ||
                siteCatalog.healthCheckSitePending
              }
            >
              {siteCatalog.addSitePending ||
              siteCatalog.healthCheckSitePending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {props.submitLabel ?? "등록"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
