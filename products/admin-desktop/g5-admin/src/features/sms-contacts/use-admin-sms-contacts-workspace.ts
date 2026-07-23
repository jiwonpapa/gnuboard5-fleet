import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  batchAdminSmsContacts,
  clearAdminSmsContactGroup,
  createAdminSmsContact,
  createAdminSmsContactGroup,
  deleteAdminSmsContact,
  deleteAdminSmsContactGroup,
  exportAdminSmsContacts,
  getAdminSmsConfig,
  getAdminSmsContact,
  getAdminSmsContactGroup,
  getAdminSmsContactGroupList,
  getAdminSmsContactList,
  importAdminSmsContacts,
  moveAdminSmsContactGroup,
  type CommandError,
  updateAdminSmsContact,
  updateAdminSmsContactGroup,
} from "../../api/client";
import {
  adminSmsContactFormSchema,
  adminSmsContactGroupFormSchema,
  adminSmsContactImportFormSchema,
  buildAdminSmsContactBatchInput,
  buildAdminSmsContactCreateInput,
  buildAdminSmsContactExportQuery,
  buildAdminSmsContactGroupCreateInput,
  buildAdminSmsContactGroupMoveInput,
  buildAdminSmsContactGroupUpdateInput,
  buildAdminSmsContactImportInputFromFile,
  buildAdminSmsContactImportInputFromText,
  buildAdminSmsContactListQuery,
  buildAdminSmsContactUpdateInput,
  emptyAdminSmsContactFormValues,
  emptyAdminSmsContactGroupFormValues,
  emptyAdminSmsContactImportFormValues,
  type AdminSmsContactFormValues,
  type AdminSmsContactGroupFormValues,
  type AdminSmsContactImportFormValues,
} from "./admin-sms-contacts-form";
import {
  buildContactResetValues,
  buildSmsContactsPageCopy,
  invalidateSmsContactQueries,
  toggleSmsContactSelection,
} from "./admin-sms-contacts-page-helpers";

export function useAdminSmsContactsWorkspace() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isFileRoute = location.pathname.endsWith("/contact-files");
  const isGroupRoute = location.pathname.endsWith("/contact-groups");
  const [contactPage, setContactPage] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(
    null,
  );
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [searchField, setSearchField] = useState("all");
  const [search, setSearch] = useState("");
  const [withPhoneOnly, setWithPhoneOnly] = useState(false);
  const [groupMoveTarget, setGroupMoveTarget] = useState("");
  const [batchTarget, setBatchTarget] = useState("");
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const configQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsConfig>>,
    CommandError
  >({
    queryKey: ["admin", "sms", "config"],
    queryFn: () => getAdminSmsConfig(),
    retry: false,
  });
  const storageReady =
    configQuery.isSuccess && configQuery.data.config.storage_ready;

  const groupForm = useForm<AdminSmsContactGroupFormValues>({
    defaultValues: emptyAdminSmsContactGroupFormValues,
    resolver: zodResolver(adminSmsContactGroupFormSchema),
  });
  const contactForm = useForm<AdminSmsContactFormValues>({
    defaultValues: emptyAdminSmsContactFormValues,
    resolver: zodResolver(adminSmsContactFormSchema),
  });
  const importForm = useForm<AdminSmsContactImportFormValues>({
    defaultValues: emptyAdminSmsContactImportFormValues,
    resolver: zodResolver(adminSmsContactImportFormSchema),
  });

  const groupListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsContactGroupList>>,
    CommandError
  >({
    enabled: storageReady,
    queryKey: ["admin", "sms", "contact-groups"],
    queryFn: () => getAdminSmsContactGroupList(),
    retry: false,
  });
  const groups = groupListQuery.data?.groups ?? [];
  const activeGroupId = selectedGroupId ?? groups[0]?.bg_no ?? null;

  const groupDetailQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsContactGroup>>,
    CommandError
  >({
    enabled: storageReady && activeGroupId !== null,
    queryKey: ["admin", "sms", "contact-groups", activeGroupId],
    queryFn: () => getAdminSmsContactGroup(activeGroupId ?? 0),
    retry: false,
  });

  const contactListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsContactList>>,
    CommandError
  >({
    enabled: storageReady,
    queryKey: [
      "admin",
      "sms",
      "contacts",
      contactPage,
      activeGroupId,
      searchField,
      search,
      withPhoneOnly,
    ],
    queryFn: () =>
      getAdminSmsContactList(
        buildAdminSmsContactListQuery(
          contactPage,
          20,
          activeGroupId,
          searchField,
          search,
          withPhoneOnly,
        ),
      ),
    retry: false,
  });

  const contactDetailQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsContact>>,
    CommandError
  >({
    enabled: storageReady && selectedContactId !== null,
    queryKey: ["admin", "sms", "contacts", selectedContactId],
    queryFn: () => getAdminSmsContact(selectedContactId ?? 0),
    retry: false,
  });

  useEffect(() => {
    const group = groupDetailQuery.data?.group;
    if (!group) {
      return;
    }

    groupForm.reset({ bg_no: group.bg_no, bg_name: group.bg_name });
    if (contactForm.getValues("bk_no") === null) {
      contactForm.setValue("bg_no", String(group.bg_no));
    }
    importForm.setValue("bg_no", String(group.bg_no));
  }, [contactForm, groupDetailQuery.data?.group, groupForm, importForm]);

  useEffect(() => {
    const contact = contactDetailQuery.data?.contact;
    if (!contact) {
      return;
    }

    contactForm.reset({
      bk_no: contact.bk_no,
      bg_no: String(contact.bg_no),
      mb_id: contact.mb_id ?? "",
      bk_name: contact.bk_name,
      bk_hp: contact.bk_hp,
      bk_receipt: contact.bk_receipt === 1,
      bk_memo: contact.bk_memo ?? "",
    });
  }, [contactDetailQuery.data?.contact, contactForm]);

  const createGroupMutation = useMutation({
    mutationFn: async (values: AdminSmsContactGroupFormValues) =>
      createAdminSmsContactGroup(buildAdminSmsContactGroupCreateInput(values)),
    onSuccess: async (response) => {
      toast.success(
        `휴대폰번호 그룹 ${response.group.bg_name}을 생성했습니다.`,
      );
      setSelectedGroupId(response.group.bg_no);
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (values: AdminSmsContactGroupFormValues) =>
      updateAdminSmsContactGroup(buildAdminSmsContactGroupUpdateInput(values)),
    onSuccess: async () => {
      toast.success("휴대폰번호 그룹을 수정했습니다.");
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async () =>
      deleteAdminSmsContactGroup({ bg_no: activeGroupId ?? 0 }),
    onSuccess: async () => {
      toast.success("휴대폰번호 그룹을 삭제했습니다.");
      setDeleteGroupDialogOpen(false);
      setSelectedGroupId(null);
      groupForm.reset(emptyAdminSmsContactGroupFormValues);
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const moveGroupMutation = useMutation({
    mutationFn: async () =>
      moveAdminSmsContactGroup(
        buildAdminSmsContactGroupMoveInput(
          activeGroupId ?? 0,
          Number.parseInt(groupMoveTarget.trim() || "0", 10),
        ),
      ),
    onSuccess: async (response) => {
      toast.success(`그룹 이동 완료: ${response.result.affected}건`);
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const clearGroupMutation = useMutation({
    mutationFn: async () => clearAdminSmsContactGroup(activeGroupId ?? 0),
    onSuccess: async (response) => {
      toast.success(`그룹을 비웠습니다. 삭제 ${response.result.deleted}건`);
      setSelectedContactId(null);
      setSelectedContactIds([]);
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const createContactMutation = useMutation({
    mutationFn: async (values: AdminSmsContactFormValues) =>
      createAdminSmsContact(buildAdminSmsContactCreateInput(values)),
    onSuccess: async (response) => {
      toast.success(`연락처 ${response.contact.bk_name}을 생성했습니다.`);
      setSelectedContactId(response.contact.bk_no);
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const updateContactMutation = useMutation({
    mutationFn: async (values: AdminSmsContactFormValues) =>
      updateAdminSmsContact(buildAdminSmsContactUpdateInput(values)),
    onSuccess: async () => {
      toast.success("연락처를 수정했습니다.");
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async () =>
      deleteAdminSmsContact({ bk_no: selectedContactId ?? 0 }),
    onSuccess: async () => {
      toast.success("연락처를 삭제했습니다.");
      setDeleteContactDialogOpen(false);
      setSelectedContactId(null);
      contactForm.reset(buildContactResetValues(activeGroupId));
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const batchMutation = useMutation({
    mutationFn: async (
      action: "allow" | "copy" | "delete" | "move" | "reject",
    ) =>
      batchAdminSmsContacts(
        buildAdminSmsContactBatchInput(
          action,
          selectedContactIds,
          ["copy", "move"].includes(action)
            ? Number.parseInt(batchTarget.trim() || "0", 10)
            : null,
        ),
      ),
    onSuccess: async (response) => {
      toast.success(`일괄 처리 완료: ${response.result.affected}건`);
      setSelectedContactIds([]);
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const importMutation = useMutation({
    mutationFn: async (values: AdminSmsContactImportFormValues) => {
      const groupId = Number.parseInt(values.bg_no, 10);
      if (importFile) {
        return importAdminSmsContacts(
          await buildAdminSmsContactImportInputFromFile(
            groupId,
            values.dry_run,
            importFile,
          ),
        );
      }

      return importAdminSmsContacts(
        buildAdminSmsContactImportInputFromText(
          groupId,
          values.dry_run,
          values.contacts_text,
        ),
      );
    },
    onSuccess: async (response) => {
      const label = response.result.dry_run ? "드라이런" : "가져오기";
      toast.success(
        `${label} 완료: 가능 ${response.result.importable_count}건, 반영 ${response.result.imported_count}건`,
      );
      if (!response.result.dry_run) {
        setImportFile(null);
        importForm.setValue("contacts_text", "");
      }
      await invalidateSmsContactQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const exportMutation = useMutation({
    mutationFn: async (values: AdminSmsContactImportFormValues) =>
      exportAdminSmsContacts(
        buildAdminSmsContactExportQuery(
          values.bg_no,
          values.include_no_phone,
          values.with_hyphen,
        ),
      ),
    onSuccess: (response) => {
      toast.success(`내보내기 미리보기 ${response.total}건을 불러왔습니다.`);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const contacts = contactListQuery.data?.contacts ?? [];
  const contactPagination = contactListQuery.data?.pagination ?? null;
  const contactSummary = contactListQuery.data?.summary ?? null;
  const selectedGroup = groupDetailQuery.data?.group ?? null;
  const selectedContact = contactDetailQuery.data?.contact ?? null;
  const availableMoveTargets = groups.filter(
    (group) => group.bg_no !== activeGroupId,
  );
  const topError =
    configQuery.error ??
    groupListQuery.error ??
    groupDetailQuery.error ??
    contactListQuery.error ??
    contactDetailQuery.error ??
    createGroupMutation.error ??
    updateGroupMutation.error ??
    deleteGroupMutation.error ??
    moveGroupMutation.error ??
    clearGroupMutation.error ??
    createContactMutation.error ??
    updateContactMutation.error ??
    deleteContactMutation.error ??
    batchMutation.error ??
    importMutation.error ??
    exportMutation.error ??
    null;
  const isBusy =
    createGroupMutation.isPending ||
    updateGroupMutation.isPending ||
    deleteGroupMutation.isPending ||
    moveGroupMutation.isPending ||
    clearGroupMutation.isPending ||
    createContactMutation.isPending ||
    updateContactMutation.isPending ||
    deleteContactMutation.isPending ||
    batchMutation.isPending ||
    importMutation.isPending ||
    exportMutation.isPending;
  const pageCopy = buildSmsContactsPageCopy(isFileRoute, isGroupRoute);
  const exportRows = (exportMutation.data?.items ?? []).slice(0, 20);
  const importResultDescription = importMutation.data
    ? `가져오기 결과: 전체 ${importMutation.data.result.total_count}건, 중복 ${importMutation.data.result.duplicate_count}건, 가능 ${importMutation.data.result.importable_count}건, 실제 반영 ${importMutation.data.result.imported_count}건`
    : null;

  return {
    activeGroupId,
    availableMoveTargets,
    batchMutation,
    batchTarget,
    contactForm,
    contactPage,
    contactPagination,
    contactSummary,
    contacts,
    createContactMutation,
    deleteContactDialogOpen,
    deleteContactMutation,
    deleteGroupDialogOpen,
    deleteGroupMutation,
    exportMutation,
    exportRows,
    exportTotal: exportMutation.data?.total ?? null,
    groupForm,
    groupMoveTarget,
    groups,
    importFile,
    importForm,
    importMutation,
    importResultDescription,
    isBusy,
    isStorageUnavailable:
      configQuery.isSuccess && !configQuery.data.config.storage_ready,
    pageCopy,
    missingTables: configQuery.data?.config.missing_tables ?? [],
    search,
    searchField,
    selectedContact,
    selectedContactId,
    selectedContactIds,
    selectedGroup,
    setBatchTarget,
    setContactPage,
    setDeleteContactDialogOpen,
    setDeleteGroupDialogOpen,
    setGroupMoveTarget,
    setImportFile,
    setSearch,
    setSearchField,
    setSelectedContactId,
    setSelectedContactIds,
    setSelectedGroupId,
    setWithPhoneOnly,
    topError,
    updateContactMutation,
    withPhoneOnly,
    clearGroupMutation,
    moveGroupMutation,
    createGroupMutation,
    updateGroupMutation,
    groupFormReset: () => {
      groupForm.reset(emptyAdminSmsContactGroupFormValues);
      setGroupMoveTarget("");
    },
    contactFormReset: () => {
      setSelectedContactId(null);
      contactForm.reset(buildContactResetValues(activeGroupId));
    },
    handleGroupSubmit: () => {
      const values = groupForm.getValues();
      if (values.bg_no === null) {
        createGroupMutation.mutate(values);
        return;
      }
      updateGroupMutation.mutate(values);
    },
    handleGroupSelect: (groupId: number) => {
      setSelectedGroupId(groupId);
      setSelectedContactId(null);
      contactForm.setValue("bg_no", String(groupId));
      importForm.setValue("bg_no", String(groupId));
    },
    handleContactSubmit: () => {
      const values = contactForm.getValues();
      if (values.bk_no === null) {
        createContactMutation.mutate(values);
        return;
      }
      updateContactMutation.mutate(values);
    },
    toggleContactSelection: (contactId: number, checked: boolean) =>
      setSelectedContactIds((current) =>
        toggleSmsContactSelection(current, contactId, checked),
      ),
  };
}
