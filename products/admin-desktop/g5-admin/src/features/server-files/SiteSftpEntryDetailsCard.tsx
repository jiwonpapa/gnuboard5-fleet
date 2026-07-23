import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { SftpStatResponse } from "../../types/SftpStatResponse";

export function SiteSftpEntryDetailsCard(props: {
  response: SftpStatResponse | null;
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>선택 항목 상세</CardTitle>
        <CardDescription>
          별도 SFTP stat 조회 결과를 표시합니다. 업로드, 다운로드, 편집은 아직 포함하지 않았습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {props.response ? (
          <div className="space-y-2 text-sm leading-6">
            <p>
              <strong>경로</strong>: {props.response.resolved_path}
            </p>
            <p>
              <strong>종류</strong>: {props.response.metadata.kind}
            </p>
            <p>
              <strong>권한</strong>: {props.response.metadata.permissions_octal ?? "unknown"}
            </p>
            <p>
              <strong>크기</strong>: {formatSize(props.response.metadata.size_bytes)}
            </p>
            <p>
              <strong>수정 시각</strong>:{" "}
              {formatTimestamp(props.response.metadata.modified_at_epoch)}
            </p>
          </div>
        ) : (
          <div className="text-sm leading-6 text-muted-foreground">
            목록에서 항목을 고르면 stat 결과가 여기에 표시됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatSize(sizeBytes: bigint | null | number | undefined) {
  if (sizeBytes === null || sizeBytes === undefined) {
    return "unknown";
  }

  const normalizedSize = typeof sizeBytes === "bigint" ? Number(sizeBytes) : sizeBytes;
  return `${normalizedSize.toLocaleString("ko-KR")} bytes`;
}

function formatTimestamp(epochSeconds: bigint | null | number | undefined) {
  if (epochSeconds === null || epochSeconds === undefined) {
    return "unknown";
  }

  const normalizedEpoch =
    typeof epochSeconds === "bigint" ? Number(epochSeconds) : epochSeconds;
  return new Date(normalizedEpoch * 1000).toLocaleString("ko-KR");
}
