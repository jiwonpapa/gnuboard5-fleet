import type { SiteBackupExportInput } from "../../types/SiteBackupExportInput";
import type { SiteBackupExportResult } from "../../types/SiteBackupExportResult";
import type { SiteBackupImportInput } from "../../types/SiteBackupImportInput";
import type { SiteBackupImportResult } from "../../types/SiteBackupImportResult";
import { invokeCommand } from "./core";

export async function exportSiteBackup(
  input: SiteBackupExportInput,
): Promise<SiteBackupExportResult> {
  return invokeCommand<SiteBackupExportResult>("cmd_backup_export", { input });
}

export async function importSiteBackup(
  input: SiteBackupImportInput,
): Promise<SiteBackupImportResult> {
  return invokeCommand<SiteBackupImportResult>("cmd_backup_import", { input });
}
