import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function SiteSshHostPolicyCard() {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>호스트 검증 정책</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
        <p>
          현재 연결 슬라이스는 로컬 <code>~/.ssh/known_hosts</code> 검증을 통과한
          서버만 허용합니다.
        </p>
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0" />
          처음 접속하는 서버라도 SSH 카드 안에서 지문을 확인하고 바로 신뢰 등록할 수
          있습니다.
        </p>
      </CardContent>
    </Card>
  );
}
