import type { MasterLockSetupInput } from "../../types/MasterLockSetupInput";
import type { MasterLockStatus } from "../../types/MasterLockStatus";
import type { MasterLockTotpInput } from "../../types/MasterLockTotpInput";
import type { MasterLockUnlockInput } from "../../types/MasterLockUnlockInput";
import { invokeCommand } from "./core";

export async function getMasterLockStatus(): Promise<MasterLockStatus> {
  return invokeCommand<MasterLockStatus>("cmd_master_lock_status");
}

export async function setupMasterLock(
  input: MasterLockSetupInput,
): Promise<MasterLockStatus> {
  return invokeCommand<MasterLockStatus>("cmd_master_lock_setup", { input });
}

export async function unlockMasterLock(
  input: MasterLockUnlockInput,
): Promise<MasterLockStatus> {
  return invokeCommand<MasterLockStatus>("cmd_master_lock_unlock", { input });
}

export async function unlockFastMasterLock(): Promise<MasterLockStatus> {
  return invokeCommand<MasterLockStatus>("cmd_master_lock_unlock_fast");
}

export async function lockMasterLock(): Promise<MasterLockStatus> {
  return invokeCommand<MasterLockStatus>("cmd_master_lock_lock");
}

export async function verifyMasterLockTotp(
  input: MasterLockTotpInput,
): Promise<MasterLockStatus> {
  return invokeCommand<MasterLockStatus>("cmd_master_lock_verify_totp", { input });
}
