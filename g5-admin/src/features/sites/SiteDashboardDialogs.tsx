import type { CommandError } from "../../api/client";
import { StepUpAuthDialog } from "../security/StepUpAuthDialog";
import { SiteFormDialog } from "./SiteFormDialog";
import {
  buildBackupPasswordDescription,
  buildBackupPasswordLabel,
  buildSensitiveActionConfirmLabel,
  buildSensitiveActionDescription,
  buildSensitiveActionTitle,
  requiresBackupPassword,
  type SensitiveAction,
} from "./site-dashboard-helpers";

type StepUpAuthFormState = {
  backup_password: string;
  backup_password_confirm: string;
  current_password: string;
  current_totp_code: string;
};

export function SiteDashboardDialogs(props: {
  backupPending: null | "export" | "import" | "lock";
  deleteSitePending: boolean;
  dialogOpen: boolean;
  onBackupPasswordChange: (value: string) => void;
  onBackupPasswordConfirmChange: (value: string) => void;
  onDialogClose: () => void;
  onPasswordChange: (value: string) => void;
  onRegisteredSiteId: (siteId: string) => void;
  onSensitiveActionCancel: () => void;
  onSensitiveActionConfirm: () => void;
  onTotpCodeChange: (value: string) => void;
  requiresTotp: boolean;
  sensitiveAction: SensitiveAction | null;
  stepUpAuth: StepUpAuthFormState;
  stepUpError: CommandError | null;
}) {
  return (
    <>
      <SiteFormDialog
        open={props.dialogOpen}
        onClose={props.onDialogClose}
        onRegistered={(catalog) => {
          const nextSiteId = catalog.active_site_id ?? catalog.sites[0]?.site.id;
          if (!nextSiteId) {
            return;
          }

          props.onRegisteredSiteId(nextSiteId);
        }}
      />
      <StepUpAuthDialog
        open={props.sensitiveAction !== null}
        title={buildSensitiveActionTitle(props.sensitiveAction)}
        description={buildSensitiveActionDescription(props.sensitiveAction)}
        confirmLabel={buildSensitiveActionConfirmLabel(props.sensitiveAction)}
        password={props.stepUpAuth.current_password}
        totpCode={props.stepUpAuth.current_totp_code}
        backupPassword={props.stepUpAuth.backup_password}
        backupPasswordConfirm={props.stepUpAuth.backup_password_confirm}
        requiresBackupPassword={requiresBackupPassword(props.sensitiveAction)}
        backupPasswordLabel={buildBackupPasswordLabel(props.sensitiveAction)}
        backupPasswordDescription={buildBackupPasswordDescription(
          props.sensitiveAction
        )}
        backupPasswordConfirmLabel={
          props.sensitiveAction?.kind === "export" ? "백업 암호 확인" : undefined
        }
        requiresTotp={props.requiresTotp}
        error={props.stepUpError}
        isPending={
          props.deleteSitePending ||
          props.backupPending === "export" ||
          props.backupPending === "import"
        }
        onBackupPasswordChange={props.onBackupPasswordChange}
        onBackupPasswordConfirmChange={
          props.sensitiveAction?.kind === "export"
            ? props.onBackupPasswordConfirmChange
            : undefined
        }
        onPasswordChange={props.onPasswordChange}
        onTotpCodeChange={props.onTotpCodeChange}
        onCancel={props.onSensitiveActionCancel}
        onConfirm={props.onSensitiveActionConfirm}
      />
    </>
  );
}
