import type { SshProfileAddInput } from "../../types/SshProfileAddInput";
import type { SshProfileDeleteInput } from "../../types/SshProfileDeleteInput";
import type { SshProfileListInput } from "../../types/SshProfileListInput";
import type { SshProfileListResponse } from "../../types/SshProfileListResponse";
import type { SshProfileUpdateInput } from "../../types/SshProfileUpdateInput";
import { invokeCommand } from "./core";

export async function getSshProfileList(
  input: SshProfileListInput,
): Promise<SshProfileListResponse> {
  return invokeCommand<SshProfileListResponse>("cmd_ssh_profile_list", { input });
}

export async function addSshProfile(
  input: SshProfileAddInput,
): Promise<SshProfileListResponse> {
  return invokeCommand<SshProfileListResponse>("cmd_ssh_profile_add", { input });
}

export async function updateSshProfile(
  input: SshProfileUpdateInput,
): Promise<SshProfileListResponse> {
  return invokeCommand<SshProfileListResponse>("cmd_ssh_profile_update", { input });
}

export async function deleteSshProfile(
  input: SshProfileDeleteInput,
): Promise<SshProfileListResponse> {
  return invokeCommand<SshProfileListResponse>("cmd_ssh_profile_delete", { input });
}
