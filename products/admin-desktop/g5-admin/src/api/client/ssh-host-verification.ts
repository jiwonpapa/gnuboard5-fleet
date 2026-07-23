import type { SshHostTrustInput } from "../../types/SshHostTrustInput";
import type { SshHostVerificationInput } from "../../types/SshHostVerificationInput";
import type { SshHostVerificationResponse } from "../../types/SshHostVerificationResponse";
import { invokeCommand } from "./core";

export async function getSshHostVerificationStatus(
  input: SshHostVerificationInput,
): Promise<SshHostVerificationResponse> {
  return invokeCommand<SshHostVerificationResponse>(
    "cmd_ssh_host_verification_status",
    { input },
  );
}

export async function trustSshHostVerification(
  input: SshHostTrustInput,
): Promise<SshHostVerificationResponse> {
  return invokeCommand<SshHostVerificationResponse>(
    "cmd_ssh_host_verification_trust",
    { input },
  );
}
