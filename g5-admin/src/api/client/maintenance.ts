import type { AdminMaintenanceResponse } from "../../types/AdminMaintenanceResponse";
import { invokeCommand } from "./core";

export async function purgeAdminSessionFiles(): Promise<AdminMaintenanceResponse> {
  return invokeCommand<AdminMaintenanceResponse>(
    "cmd_admin_maintenance_purge_session_files",
  );
}

export async function purgeAdminCacheFiles(): Promise<AdminMaintenanceResponse> {
  return invokeCommand<AdminMaintenanceResponse>(
    "cmd_admin_maintenance_purge_cache_files",
  );
}

export async function purgeAdminCaptchaFiles(): Promise<AdminMaintenanceResponse> {
  return invokeCommand<AdminMaintenanceResponse>(
    "cmd_admin_maintenance_purge_captcha_files",
  );
}

export async function purgeAdminThumbnailFiles(): Promise<AdminMaintenanceResponse> {
  return invokeCommand<AdminMaintenanceResponse>(
    "cmd_admin_maintenance_purge_thumbnail_files",
  );
}

export async function purgeAdminMemberListFiles(): Promise<AdminMaintenanceResponse> {
  return invokeCommand<AdminMaintenanceResponse>(
    "cmd_admin_maintenance_purge_member_list_files",
  );
}
