import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import type { SftpReadFileResponse } from "../../types/SftpReadFileResponse";

export function SiteSftpFilePreviewCard(props: {
  response: SftpReadFileResponse | null;
  onSave: (path: string, content: string) => void | Promise<void>;
  savePending: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>파일 미리보기</CardTitle>
        <CardDescription>
          현재 단계는 텍스트 본문 미리보기와 저장만 제공합니다. binary 안전성이 불분명한
          경우 저장은 막습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.response ? (
          <EditablePreview
            key={`${props.response.resolved_path}:${props.response.request_id}`}
            response={props.response}
            onSave={props.onSave}
            savePending={props.savePending}
          />
        ) : (
          <div className="text-sm leading-6 text-muted-foreground">
            목록에서 파일의 `본문` 버튼을 누르면 텍스트 미리보기와 저장 카드가 여기에
            표시됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditablePreview(props: {
  response: SftpReadFileResponse;
  onSave: (path: string, content: string) => void | Promise<void>;
  savePending: boolean;
}) {
  const [draft, setDraft] = useState(props.response.content);
  const saveBlocked = props.response.truncated || props.response.utf8_lossy;
  const saveDisabled =
    saveBlocked || draft === props.response.content || props.savePending;

  return (
    <>
      <div className="space-y-1 text-sm leading-6">
        <p>
          <strong>경로</strong>: {props.response.resolved_path}
        </p>
        <p>
          <strong>길이</strong>: {props.response.byte_length.toLocaleString("ko-KR")} bytes
        </p>
        <p>
          <strong>디코딩</strong>: {props.response.utf8_lossy ? "utf-8-lossy" : "utf-8"}
        </p>
        {props.response.truncated ? (
          <p className="text-amber-700 dark:text-amber-300">
            미리보기 상한 때문에 일부만 표시했습니다. 이 상태에서는 잘못된 덮어쓰기를
            막기 위해 저장을 비활성화합니다.
          </p>
        ) : null}
        {props.response.utf8_lossy ? (
          <p className="text-amber-700 dark:text-amber-300">
            UTF-8 lossless 본문이 아니어서 현재 슬라이스에서는 저장을 막습니다.
          </p>
        ) : null}
      </div>
      <Textarea
        rows={14}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        className="font-mono text-xs leading-6"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={saveDisabled}
          onClick={() => {
            void props.onSave(props.response.resolved_path, draft);
          }}
        >
          저장
        </Button>
      </div>
    </>
  );
}
