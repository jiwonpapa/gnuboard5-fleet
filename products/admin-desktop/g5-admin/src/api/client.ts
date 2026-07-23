export type { CommandError } from "./client/core";

export { getSystemHealth } from "./client/health";
export { exportSiteBackup, importSiteBackup } from "./client/backup";
export {
  authLogin,
  authLogout,
  authRefresh,
  authStatus,
  getMyProfile,
} from "./client/auth";
export {
  lockMasterLock,
  getMasterLockStatus,
  setupMasterLock,
  unlockFastMasterLock,
  unlockMasterLock,
  verifyMasterLockTotp,
} from "./client/master-lock";
export {
  changeMasterPassword,
  disableFastUnlock,
  disableTotp,
  enableFastUnlock,
  enableTotp,
  getFastUnlockStatus,
  getSecuritySettings,
  startTotpEnrollment,
  updateSecurityIdleTimeout,
} from "./client/security";
export {
  createAdminBoard,
  copyAdminBoard,
  deleteAdminBoard,
  deleteAdminBoardNewPosts,
  getAdminBoard,
  getAdminBoardList,
  updateAdminBoard,
} from "./client/boards";
export {
  addAdminBoardGroupMember,
  addLegacyAdminGroupMember,
  createAdminBoardGroup,
  createLegacyAdminGroup,
  deleteAdminBoardGroup,
  deleteAdminBoardGroupMember,
  deleteLegacyAdminGroup,
  deleteLegacyAdminGroupMember,
  getAdminBoardGroup,
  getAdminBoardGroupList,
  getAdminBoardGroupMembers,
  getLegacyAdminGroup,
  getLegacyAdminGroupList,
  getLegacyAdminGroupMembers,
  patchAdminBoardGroup,
  updateAdminBoardGroup,
  updateLegacyAdminGroup,
} from "./client/board-groups";
export { getAdminConfig, updateAdminConfig } from "./client/config";
export {
  createAdminContent,
  deleteAdminContent,
  getAdminContent,
  getAdminContentList,
  updateAdminContent,
} from "./client/contents";
export { getAdminDashboard } from "./client/dashboard";
export {
  applyDebugDevBootstrap,
  getDebugDevBootstrapStatus,
  getDebugLogTail,
  getDebugRuntimeInfo,
  openDebugDevtools,
} from "./client/debug";
export {
  addSite,
  deleteSite,
  getSiteActivityList,
  getSiteCatalog,
  healthCheckSite,
  switchSite,
  updateSite,
} from "./client/sites";
export { connectSsh, disconnectSsh, getSshStatus } from "./client/ssh-session";
export {
  getSshHostVerificationStatus,
  trustSshHostVerification,
} from "./client/ssh-host-verification";
export {
  closeSshShell,
  listenSshShellStream,
  openSshShell,
  readSshShell,
  resizeSshShell,
  writeSshShell,
} from "./client/ssh-shell";
export { connectSshTerminalBridge } from "./client/ssh-terminal-bridge";
export {
  chmodSftpPath,
  copySftpPath,
  deleteSftpPath,
  downloadSftpFile,
  listSftpDirectory,
  mkdirSftpDirectory,
  moveSftpPath,
  readSftpFile,
  statSftpPath,
  uploadSftpFile,
  writeSftpFile,
} from "./client/sftp";
export {
  cancelSftpTransfer,
  enqueueSftpTransfers,
  getSftpTransferQueueSnapshot,
  listenSftpTransferQueue,
  pauseSftpTransfer,
  retrySftpTransfer,
  setSftpTransferConcurrency,
} from "./client/sftp-transfer";
export {
  addSshProfile,
  deleteSshProfile,
  getSshProfileList,
  updateSshProfile,
} from "./client/ssh-profiles";
export {
  createAdminFaq,
  createAdminFaqMaster,
  deleteAdminFaq,
  deleteAdminFaqMaster,
  deleteAdminFaqMasterFooterImage,
  deleteAdminFaqMasterHeaderImage,
  getAdminFaq,
  getAdminFaqList,
  getAdminFaqMaster,
  getAdminFaqMasterList,
  updateAdminFaq,
  updateAdminFaqMaster,
  uploadAdminFaqMasterFooterImage,
  uploadAdminFaqMasterHeaderImage,
} from "./client/faqs";
export {
  addAdminLayoutWidget,
  deleteAdminLayoutWidget,
  getAdminLayout,
  getAdminLayoutList,
  reorderAdminLayoutWidgets,
  reorderLegacyAdminLayoutWidgets,
  saveAdminLayout,
  updateAdminLayoutWidget,
} from "./client/layouts";
export {
  createAdminMailTemplate,
  deleteAdminMailTemplate,
  getAdminSystemMailRecipients,
  getAdminSystemMailTemplateList,
  getAdminMailRecipients,
  getAdminMailTemplate,
  getAdminMailTemplateList,
  sendAdminMail,
  sendAdminSystemMail,
  updateAdminMailTemplate,
} from "./client/mails";
export {
  sendAdminMailTest,
  sendLegacyAdminMailsTest,
  sendLegacyAdminMailTests,
} from "./client/mail-test";
export {
  purgeAdminCacheFiles,
  purgeAdminCaptchaFiles,
  purgeAdminMemberListFiles,
  purgeAdminSessionFiles,
  purgeAdminThumbnailFiles,
} from "./client/maintenance";
export {
  createAdminMenu,
  deleteAdminMenu,
  getAdminMenu,
  getAdminMenuList,
  reorderAdminMenus,
  reorderLegacyAdminMenus,
  updateAdminMenu,
} from "./client/menu";
export {
  deleteAdminMember,
  deleteAdminMemberIcon,
  deleteAdminMemberImage,
  exportAdminMembersExcel,
  getAdminMember,
  getAdminMemberList,
  uploadAdminMemberIcon,
  uploadAdminMemberImage,
  updateAdminMember,
  updateAdminMemberLevel,
} from "./client/members";
export {
  deleteAdminAuthMember,
  deleteAdminPermission,
  getAdminAuthList,
  getAdminPermissionList,
  saveAdminPermission,
  upsertAdminAuth,
} from "./client/permissions";
export {
  deductAdminPoint,
  deductLegacyAdminPoint,
  deleteAdminPointHistory,
  expireAdminPoints,
  expireLegacyAdminPoints,
  getAdminPointList,
  getAdminPointSummary,
  grantAdminPoint,
  grantLegacyAdminPoint,
} from "./client/points";
export {
  getAdminPopularList,
  getAdminPopularRank,
  resetAdminPopular,
} from "./client/popular";
export {
  createAdminPoll,
  createLegacyAdminPoll,
  deleteAdminPoll,
  deleteLegacyAdminPoll,
  getAdminPoll,
  getAdminPollList,
  getLegacyAdminPoll,
  getLegacyAdminPollList,
  updateAdminPoll,
  updateLegacyAdminPoll,
} from "./client/polls";
export {
  createAdminPopup,
  createLegacyAdminPopup,
  deleteAdminPopup,
  deleteLegacyAdminPopup,
  getAdminPopup,
  getAdminPopupList,
  getLegacyAdminPopup,
  getLegacyAdminPopupList,
  updateAdminPopup,
  updateLegacyAdminPopup,
} from "./client/popups";
export { createAdminPushMessage, sendAdminPushMessage } from "./client/push";
export { bulkDeleteAdminQa } from "./client/qa";
export { getAdminQaConfig, updateAdminQaConfig } from "./client/qa-config";
export {
  getAdminReportList,
  getAdminReportStats,
  updateAdminReport,
} from "./client/reports";
export {
  getAdminFieldSchema,
  getAdminFieldSchemaCatalog,
} from "./client/schema";
export {
  getAdminSmsConfig,
  syncAdminSmsMembers,
  updateAdminSmsConfig,
} from "./client/sms";
export {
  batchAdminSmsTemplates,
  clearAdminSmsTemplateGroup,
  createAdminSmsTemplate,
  createAdminSmsTemplateGroup,
  deleteAdminSmsTemplate,
  deleteAdminSmsTemplateGroup,
  getAdminSmsTemplate,
  getAdminSmsTemplateGroup,
  getAdminSmsTemplateGroupList,
  getAdminSmsTemplateList,
  moveAdminSmsTemplateGroup,
  updateAdminSmsTemplate,
  updateAdminSmsTemplateGroup,
} from "./client/sms-templates";
export {
  batchAdminSmsContacts,
  clearAdminSmsContactGroup,
  createAdminSmsContact,
  createAdminSmsContactGroup,
  deleteAdminSmsContact,
  deleteAdminSmsContactGroup,
  exportAdminSmsContacts,
  getAdminSmsContact,
  getAdminSmsContactGroup,
  getAdminSmsContactGroupList,
  getAdminSmsContactList,
  importAdminSmsContacts,
  moveAdminSmsContactGroup,
  updateAdminSmsContact,
  updateAdminSmsContactGroup,
} from "./client/sms-contacts";
export {
  getAdminSmsDeliveryList,
  getAdminSmsMessageBatch,
  getAdminSmsMessageBatchList,
  resendAdminSmsBatchAll,
  resendAdminSmsBatchFailures,
} from "./client/sms-history";
export { sendAdminSmsMessage } from "./client/sms-messages";
export {
  convertAdminBrowscap,
  getAdminBrowscapStatus,
  getAdminPhpInfo,
  updateAdminBrowscap,
} from "./client/system-tools";
export {
  getAdminTheme,
  getAdminThemeConfig,
  getAdminThemeList,
  updateAdminThemeConfig,
} from "./client/theme";
export {
  deleteAdminVisits,
  getAdminVisitStats,
  searchAdminVisits,
} from "./client/visits";
export { getAdminWriteCountStats } from "./client/write-count";
