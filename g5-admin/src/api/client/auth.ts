import type { AuthLoginInput } from "../../types/AuthLoginInput";
import type { AuthSessionState } from "../../types/AuthSessionState";
import type { MemberProfileResponse } from "../../types/MemberProfileResponse";
import { invokeCommand } from "./core";

export async function authStatus(): Promise<AuthSessionState> {
  return invokeCommand<AuthSessionState>("cmd_auth_status");
}

export async function authLogin(
  input: AuthLoginInput
): Promise<AuthSessionState> {
  return invokeCommand<AuthSessionState>("cmd_auth_login", { input });
}

export async function authLogout(): Promise<AuthSessionState> {
  return invokeCommand<AuthSessionState>("cmd_auth_logout");
}

export async function authRefresh(): Promise<AuthSessionState> {
  return invokeCommand<AuthSessionState>("cmd_auth_refresh");
}

export async function getMyProfile(): Promise<MemberProfileResponse> {
  return invokeCommand<MemberProfileResponse>("cmd_member_me_get");
}
