import type { FastUnlockStatus } from "../../types/FastUnlockStatus";
import type { MasterPasswordChangeInput } from "../../types/MasterPasswordChangeInput";
import type { SecurityStepUpAuthInput } from "../../types/SecurityStepUpAuthInput";
import type { SecurityIdleTimeoutUpdateInput } from "../../types/SecurityIdleTimeoutUpdateInput";
import type { SecuritySettings } from "../../types/SecuritySettings";
import type { TotpDisableInput } from "../../types/TotpDisableInput";
import type { TotpEnrollmentChallenge } from "../../types/TotpEnrollmentChallenge";
import type { TotpSetupStartInput } from "../../types/TotpSetupStartInput";
import type { TotpVerifyEnableInput } from "../../types/TotpVerifyEnableInput";
import { invokeCommand } from "./core";

export async function getSecuritySettings(): Promise<SecuritySettings> {
  return invokeCommand<SecuritySettings>("cmd_security_settings_get");
}

export async function getFastUnlockStatus(): Promise<FastUnlockStatus> {
  return invokeCommand<FastUnlockStatus>("cmd_security_fast_unlock_status");
}

export async function enableFastUnlock(
  input: SecurityStepUpAuthInput,
): Promise<FastUnlockStatus> {
  return invokeCommand<FastUnlockStatus>("cmd_security_enable_fast_unlock", { input });
}

export async function disableFastUnlock(
  input: SecurityStepUpAuthInput,
): Promise<FastUnlockStatus> {
  return invokeCommand<FastUnlockStatus>("cmd_security_disable_fast_unlock", { input });
}

export async function changeMasterPassword(
  input: MasterPasswordChangeInput,
): Promise<SecuritySettings> {
  return invokeCommand<SecuritySettings>("cmd_security_change_master_password", { input });
}

export async function updateSecurityIdleTimeout(
  input: SecurityIdleTimeoutUpdateInput,
): Promise<SecuritySettings> {
  return invokeCommand<SecuritySettings>("cmd_security_update_idle_timeout", { input });
}

export async function startTotpEnrollment(
  input: TotpSetupStartInput,
): Promise<TotpEnrollmentChallenge> {
  return invokeCommand<TotpEnrollmentChallenge>("cmd_security_start_totp_enrollment", { input });
}

export async function enableTotp(
  input: TotpVerifyEnableInput,
): Promise<SecuritySettings> {
  return invokeCommand<SecuritySettings>("cmd_security_enable_totp", { input });
}

export async function disableTotp(
  input: TotpDisableInput,
): Promise<SecuritySettings> {
  return invokeCommand<SecuritySettings>("cmd_security_disable_totp", { input });
}
