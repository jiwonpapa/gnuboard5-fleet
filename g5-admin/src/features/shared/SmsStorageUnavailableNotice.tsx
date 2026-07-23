import { Database } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function SmsStorageUnavailableNotice(props: {
  missingTables: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle>SMS 저장소 미구성</CardTitle>
        </div>
        <CardDescription>
          이 사이트에는 선택 기능인 SMS5 저장소가 설치되지 않았습니다. 서버에서
          SMS5 테이블을 설치한 뒤 다시 이용하십시오.
        </CardDescription>
      </CardHeader>
      {props.missingTables.length > 0 ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            누락 테이블: {props.missingTables.join(", ")}
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}
