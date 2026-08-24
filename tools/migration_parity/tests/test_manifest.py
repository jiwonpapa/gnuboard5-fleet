from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from tools.migration_parity.manifest import ManifestError, load_manifest, validate_manifest_shape


ROOT = Path(__file__).resolve().parents[3]


class ManifestTest(unittest.TestCase):
    def test_repository_manifest_has_required_contract(self) -> None:
        manifest = load_manifest(ROOT / "governance/MIGRATION_PARITY.json")
        self.assertEqual("g5-fleet.migration-parity/v1", manifest["schema"])
        self.assertEqual(
            {
                "tauri_commands",
                "react_pages",
                "rust_workspace_members",
                "frontend_tests",
                "rust_tests",
            },
            set(manifest["mappings"]),
        )
        self.assertEqual(
            {
                "adminGetDashboard",
                "adminGetConfig",
                "adminUpdateConfig",
                "adminListFieldSchemas",
                "adminGetFieldSchema",
                "login",
                "refreshToken",
                "logout",
                "getMyProfile",
                "adminListAuth",
                "adminUpsertAuth",
                "adminDeleteAuthByMember",
                "adminSystemListAuths",
                "adminSystemSaveAuth",
                "adminSystemDeleteAuth",
                "adminListMembers",
                "adminExportMembersExcel",
                "adminGetMember",
                "adminUpdateMember",
                "adminDeleteMember",
                "adminUpdateMemberLevel",
                "adminUploadMemberIcon",
                "adminDeleteMemberIcon",
                "adminUploadMemberImage",
                "adminDeleteMemberImage",
                "adminListBoardGroups",
                "adminCreateBoardGroup",
                "adminGetBoardGroup",
                "adminUpdateBoardGroup",
                "adminPatchBoardGroup",
                "adminDeleteBoardGroup",
                "adminListBoardGroupMembers",
                "adminAddBoardGroupMember",
                "adminDeleteBoardGroupMember",
                "adminLegacyListGroups",
                "adminLegacyCreateGroup",
                "adminLegacyGetGroup",
                "adminLegacyUpdateGroup",
                "adminLegacyDeleteGroup",
                "adminLegacyListGroupMembers",
                "adminLegacyAddGroupMember",
                "adminLegacyDeleteGroupMember",
                "adminListBoards",
                "adminCreateBoard",
                "adminGetBoard",
                "adminUpdateBoard",
                "adminDeleteBoard",
                "adminCopyBoard",
                "adminDeleteNewPosts",
                "adminListContents",
                "adminCreateContent",
                "adminGetContent",
                "adminUpdateContent",
                "adminDeleteContent",
                "adminListFaqs",
                "adminCreateFaq",
                "adminGetFaq",
                "adminUpdateFaq",
                "adminDeleteFaq",
                "adminListFaqMasters",
                "adminCreateFaqMaster",
                "adminGetFaqMaster",
                "adminUpdateFaqMaster",
                "adminDeleteFaqMaster",
                "adminUploadFaqMasterHeaderImage",
                "adminDeleteFaqMasterHeaderImage",
                "adminUploadFaqMasterFooterImage",
                "adminDeleteFaqMasterFooterImage",
                "adminListMenus",
                "adminCreateMenu",
                "adminGetMenu",
                "adminUpdateMenu",
                "adminDeleteMenu",
                "adminReorderMenus",
                "adminReorderMenusLegacy",
                "adminListLayouts",
                "adminGetLayout",
                "adminSaveLayout",
                "adminAddWidget",
                "adminUpdateWidget",
                "adminDeleteWidget",
                "adminReorderWidgetCollection",
                "adminReorderWidget",
                "adminSystemGetTheme",
                "adminSystemUpdateTheme",
                "adminSystemListThemes",
                "adminSystemDetailTheme",
                "adminCreatePointAction",
                "adminDeductPoint",
                "adminDeletePoints",
                "adminExpirePoints",
                "adminGrantPoint",
                "adminListPoints",
                "adminPointSummary",
                "adminSystemListPolls",
                "adminSystemCreatePoll",
                "adminSystemGetPoll",
                "adminSystemUpdatePoll",
                "adminSystemDeletePoll",
                "adminListPolls",
                "adminCreatePoll",
                "adminGetPoll",
                "adminUpdatePoll",
                "adminDeletePoll",
                "adminSystemListPopups",
                "adminSystemCreatePopup",
                "adminSystemGetPopup",
                "adminSystemUpdatePopup",
                "adminSystemDeletePopup",
                "adminListPopups",
                "adminCreatePopup",
                "adminGetPopup",
                "adminUpdatePopup",
                "adminDeletePopup",
                "adminListPopular",
                "adminPopularRank",
                "adminResetPopular",
                "adminDeleteVisits",
                "adminSearchVisits",
                "adminVisitStats",
                "adminListReports",
                "adminReportStats",
                "adminUpdateReport",
                "adminDeleteQaBulk",
                "adminSystemGetQaConfig",
                "adminSystemUpdateQaConfig",
                "adminWriteCountStats",
                "adminCreateMailTemplate",
                "adminCreateMailTest",
                "adminDeleteMail",
                "adminGetMail",
                "adminListMailRecipients",
                "adminListMails",
                "adminSendMail",
                "adminSendTestMail",
                "adminSystemListMailRecipients",
                "adminSystemListMails",
                "adminSystemSendMailTest",
                "adminSystemSendMemberMail",
                "adminUpdateMailTemplate",
                "adminGetSmsConfig",
                "adminSyncSmsMembers",
                "adminUpdateSmsConfig",
                "adminListSmsContactGroups",
                "adminCreateSmsContactGroup",
                "adminGetSmsContactGroup",
                "adminUpdateSmsContactGroup",
                "adminDeleteSmsContactGroup",
                "adminMoveSmsContactGroup",
                "adminClearSmsContactGroup",
                "adminListSmsContacts",
                "adminCreateSmsContact",
                "adminGetSmsContact",
                "adminUpdateSmsContact",
                "adminDeleteSmsContact",
                "adminBatchSmsContacts",
                "adminImportSmsContacts",
                "adminExportSmsContacts",
                "adminListSmsTemplateGroups",
                "adminCreateSmsTemplateGroup",
                "adminGetSmsTemplateGroup",
                "adminUpdateSmsTemplateGroup",
                "adminDeleteSmsTemplateGroup",
                "adminMoveSmsTemplateGroup",
                "adminClearSmsTemplateGroup",
                "adminListSmsTemplates",
                "adminCreateSmsTemplate",
                "adminGetSmsTemplate",
                "adminUpdateSmsTemplate",
                "adminDeleteSmsTemplate",
                "adminBatchSmsTemplates",
                "adminListSmsMessageBatches",
                "adminGetSmsMessageBatch",
                "adminListSmsDeliveries",
                "adminResendSmsFailures",
                "adminResendAllSmsBatch",
                "adminCreateSmsMessage",
                "adminCreatePushMessage",
                "adminSendPush",
            },
            {
                mapping["operation_id"]
                for mapping in manifest["core_operation_mappings"]
            },
        )

    def test_missing_legacy_category_is_harness_error(self) -> None:
        manifest = json.loads(
            (ROOT / "governance/MIGRATION_PARITY.json").read_text(encoding="utf-8")
        )
        broken = copy.deepcopy(manifest)
        del broken["legacy_baseline"]["react_pages"]
        with self.assertRaises(ManifestError):
            validate_manifest_shape(broken)

    def test_duplicate_capability_is_harness_error(self) -> None:
        manifest = json.loads(
            (ROOT / "governance/MIGRATION_PARITY.json").read_text(encoding="utf-8")
        )
        broken = copy.deepcopy(manifest)
        broken["required_capabilities"].append(
            copy.deepcopy(broken["required_capabilities"][0])
        )
        with self.assertRaisesRegex(ManifestError, "duplicate"):
            validate_manifest_shape(broken)

    def test_duplicate_core_operation_mapping_is_harness_error(self) -> None:
        manifest = json.loads(
            (ROOT / "governance/MIGRATION_PARITY.json").read_text(encoding="utf-8")
        )
        broken = copy.deepcopy(manifest)
        broken["core_operation_mappings"] = [
            {"operation_id": "getHealth"},
            {"operation_id": "getHealth"},
        ]
        with self.assertRaisesRegex(ManifestError, "duplicate"):
            validate_manifest_shape(broken)
