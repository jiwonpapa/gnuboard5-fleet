import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { SiteSftpDialogFrame } from "./SiteSftpDialogFrame";

export function SiteSftpPermissionsDialog(props: {
  onCancel: () => void;
  onConfirm: () => void;
  onPermissionsChange: (value: string) => void;
  open: boolean;
  path: string | null;
  pending: boolean;
  permissions: string;
}) {
  const normalizedPermissions = props.permissions.trim();
  const validPermissions = /^[0-7]{3,4}$/.test(normalizedPermissions);

  return (
    <SiteSftpDialogFrame
      open={props.open}
      title="SFTP 권한 변경"
      description="Unix octal 권한값을 그대로 입력합니다. 예: 644, 755, 0644"
      confirmLabel="권한 적용"
      confirmPending={props.pending}
      confirmDisabled={props.path === null || !validPermissions}
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
    >
      <div className="space-y-2">
        <Label htmlFor="sftp-permissions-path">대상 경로</Label>
        <Input id="sftp-permissions-path" value={props.path ?? ""} readOnly />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sftp-permissions-value">권한 값</Label>
        <Input
          id="sftp-permissions-value"
          value={props.permissions}
          onChange={(event) => props.onPermissionsChange(event.currentTarget.value)}
          placeholder="644"
        />
      </div>
    </SiteSftpDialogFrame>
  );
}
