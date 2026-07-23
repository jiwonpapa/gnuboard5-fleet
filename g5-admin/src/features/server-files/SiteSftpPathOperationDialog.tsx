import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { SiteSftpDialogFrame } from "./SiteSftpDialogFrame";

export function SiteSftpPathOperationDialog(props: {
  destinationPath: string;
  mode: "copy" | "move";
  onCancel: () => void;
  onConfirm: () => void;
  onDestinationPathChange: (value: string) => void;
  open: boolean;
  pending: boolean;
  sourcePaths: string[];
}) {
  const label = props.mode === "copy" ? "복사" : "이동";
  const multiple = props.sourcePaths.length > 1;
  const sourcePath = props.sourcePaths[0] ?? null;

  return (
    <SiteSftpDialogFrame
      open={props.open}
      title={`SFTP ${label}`}
      description={
        multiple
          ? `선택한 ${props.sourcePaths.length.toLocaleString("ko-KR")}개 항목을 지정한 디렉터리로 ${label}합니다.`
          : "원격 경로를 직접 지정해서 같은 서버 안에서 복사하거나 이동합니다."
      }
      confirmLabel={label}
      confirmPending={props.pending}
      confirmDisabled={
        sourcePath === null ||
        props.destinationPath.trim().length === 0 ||
        (!multiple && props.destinationPath.trim() === sourcePath?.trim())
      }
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
    >
      <div className="space-y-2">
        <Label htmlFor="sftp-path-operation-source">원본 경로</Label>
        {multiple ? (
          <div
            id="sftp-path-operation-source"
            className="rounded-xl border border-border/70 bg-background/60 px-3 py-3 text-sm text-muted-foreground"
          >
            <ul className="space-y-1">
              {props.sourcePaths.slice(0, 5).map((path) => (
                <li key={path} className="truncate">
                  {path}
                </li>
              ))}
              {props.sourcePaths.length > 5 ? (
                <li>외 {props.sourcePaths.length - 5}개</li>
              ) : null}
            </ul>
          </div>
        ) : (
          <Input id="sftp-path-operation-source" value={sourcePath ?? ""} readOnly />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="sftp-path-operation-destination">
          {multiple ? "대상 디렉터리" : "대상 경로"}
        </Label>
        <Input
          id="sftp-path-operation-destination"
          value={props.destinationPath}
          onChange={(event) => props.onDestinationPathChange(event.currentTarget.value)}
          placeholder={multiple ? "/var/www/html/releases" : "/var/www/html/example.txt"}
        />
      </div>
    </SiteSftpDialogFrame>
  );
}
