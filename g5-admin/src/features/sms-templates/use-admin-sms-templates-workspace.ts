import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  batchAdminSmsTemplates,
  clearAdminSmsTemplateGroup,
  createAdminSmsTemplate,
  createAdminSmsTemplateGroup,
  deleteAdminSmsTemplate,
  deleteAdminSmsTemplateGroup,
  getAdminSmsConfig,
  getAdminSmsTemplate,
  getAdminSmsTemplateGroup,
  getAdminSmsTemplateGroupList,
  getAdminSmsTemplateList,
  moveAdminSmsTemplateGroup,
  type CommandError,
  updateAdminSmsTemplate,
  updateAdminSmsTemplateGroup,
} from "../../api/client";
import {
  adminSmsTemplateFormSchema,
  adminSmsTemplateGroupFormSchema,
  buildAdminSmsTemplateBatchInput,
  buildAdminSmsTemplateCreateInput,
  buildAdminSmsTemplateGroupCreateInput,
  buildAdminSmsTemplateGroupMoveInput,
  buildAdminSmsTemplateGroupUpdateInput,
  buildAdminSmsTemplateListQuery,
  buildAdminSmsTemplateUpdateInput,
  emptyAdminSmsTemplateGroupFormValues,
  type AdminSmsTemplateFormValues,
  type AdminSmsTemplateGroupFormValues,
} from "./admin-sms-templates-form";
import {
  buildSmsTemplateFormDefaults,
  invalidateSmsTemplateQueries,
  normalizeSmsTemplateTarget,
  setSmsTemplateFormGroup,
  toggleSmsTemplateSelection,
} from "./admin-sms-templates-page-helpers";

export function useAdminSmsTemplatesWorkspace() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isGroupRoute = location.pathname.endsWith("/template-groups");
  const [templatePage, setTemplatePage] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [searchField, setSearchField] = useState("all");
  const [search, setSearch] = useState("");
  const [groupMoveTarget, setGroupMoveTarget] = useState("");
  const [batchMoveTarget, setBatchMoveTarget] = useState("");
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] =
    useState(false);
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

  const groupForm = useForm<AdminSmsTemplateGroupFormValues>({
    defaultValues: emptyAdminSmsTemplateGroupFormValues,
    resolver: zodResolver(adminSmsTemplateGroupFormSchema),
  });
  const templateForm = useForm<AdminSmsTemplateFormValues>({
    defaultValues: buildSmsTemplateFormDefaults(null),
    resolver: zodResolver(adminSmsTemplateFormSchema),
  });

  const groupListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsTemplateGroupList>>,
    CommandError
  >({
    enabled: storageReady,
    queryKey: ["admin", "sms", "template-groups"],
    queryFn: () => getAdminSmsTemplateGroupList(),
    retry: false,
  });
  const groups = groupListQuery.data?.groups ?? [];
  const activeGroupId = selectedGroupId ?? groups[0]?.fg_no ?? null;

  const groupDetailQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsTemplateGroup>>,
    CommandError
  >({
    enabled: storageReady && activeGroupId !== null,
    queryKey: ["admin", "sms", "template-groups", activeGroupId],
    queryFn: () => getAdminSmsTemplateGroup(activeGroupId ?? 0),
    retry: false,
  });

  const templateListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsTemplateList>>,
    CommandError
  >({
    enabled: storageReady,
    queryKey: [
      "admin",
      "sms",
      "templates",
      templatePage,
      activeGroupId,
      searchField,
      search,
    ],
    queryFn: () =>
      getAdminSmsTemplateList(
        buildAdminSmsTemplateListQuery(
          templatePage,
          20,
          activeGroupId,
          searchField,
          search,
        ),
      ),
    retry: false,
  });

  const templateDetailQuery = useQuery<
    Awaited<ReturnType<typeof getAdminSmsTemplate>>,
    CommandError
  >({
    enabled: storageReady && selectedTemplateId !== null,
    queryKey: ["admin", "sms", "templates", selectedTemplateId],
    queryFn: () => getAdminSmsTemplate(selectedTemplateId ?? 0),
    retry: false,
  });

  useEffect(() => {
    const group = groupDetailQuery.data?.group;
    if (!group) {
      return;
    }

    groupForm.reset({
      fg_no: group.fg_no,
      fg_name: group.fg_name,
      fg_member: group.fg_member === 1,
    });
    if (templateForm.getValues("fo_no") === null) {
      templateForm.setValue("fg_no", String(group.fg_no));
    }
  }, [groupDetailQuery.data?.group, groupForm, templateForm]);

  useEffect(() => {
    const template = templateDetailQuery.data?.template;
    if (!template) {
      return;
    }

    templateForm.reset({
      fo_no: template.fo_no,
      fg_no: String(template.fg_no),
      fo_name: template.fo_name,
      fo_content: template.fo_content,
    });
  }, [templateDetailQuery.data?.template, templateForm]);

  const createGroupMutation = useMutation({
    mutationFn: async (values: AdminSmsTemplateGroupFormValues) =>
      createAdminSmsTemplateGroup(
        buildAdminSmsTemplateGroupCreateInput(values),
      ),
    onSuccess: async (response) => {
      toast.success(`이모티콘 그룹 ${response.group.fg_name}을 생성했습니다.`);
      setSelectedGroupId(response.group.fg_no);
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (values: AdminSmsTemplateGroupFormValues) =>
      updateAdminSmsTemplateGroup(
        buildAdminSmsTemplateGroupUpdateInput(values),
      ),
    onSuccess: async () => {
      toast.success("이모티콘 그룹을 수정했습니다.");
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async () =>
      deleteAdminSmsTemplateGroup({ fg_no: activeGroupId ?? 0 }),
    onSuccess: async () => {
      toast.success("이모티콘 그룹을 삭제했습니다.");
      setDeleteGroupDialogOpen(false);
      setSelectedGroupId(null);
      groupForm.reset(emptyAdminSmsTemplateGroupFormValues);
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const moveGroupMutation = useMutation({
    mutationFn: async () =>
      moveAdminSmsTemplateGroup(
        buildAdminSmsTemplateGroupMoveInput(
          activeGroupId ?? 0,
          Number.parseInt(normalizeSmsTemplateTarget(groupMoveTarget), 10),
        ),
      ),
    onSuccess: async (response) => {
      toast.success(`그룹 이동 완료: ${response.result.affected}건`);
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const clearGroupMutation = useMutation({
    mutationFn: async () => clearAdminSmsTemplateGroup(activeGroupId ?? 0),
    onSuccess: async (response) => {
      toast.success(`그룹을 비웠습니다. 삭제 ${response.result.deleted}건`);
      setSelectedTemplateId(null);
      setSelectedTemplateIds([]);
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (values: AdminSmsTemplateFormValues) =>
      createAdminSmsTemplate(buildAdminSmsTemplateCreateInput(values)),
    onSuccess: async (response) => {
      toast.success(`템플릿 ${response.template.fo_name}을 생성했습니다.`);
      setSelectedTemplateId(response.template.fo_no);
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (values: AdminSmsTemplateFormValues) =>
      updateAdminSmsTemplate(buildAdminSmsTemplateUpdateInput(values)),
    onSuccess: async () => {
      toast.success("템플릿을 수정했습니다.");
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async () =>
      deleteAdminSmsTemplate({ fo_no: selectedTemplateId ?? 0 }),
    onSuccess: async () => {
      toast.success("템플릿을 삭제했습니다.");
      setDeleteTemplateDialogOpen(false);
      setSelectedTemplateId(null);
      templateForm.reset(buildSmsTemplateFormDefaults(activeGroupId));
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const batchMutation = useMutation({
    mutationFn: async (action: "delete" | "move") =>
      batchAdminSmsTemplates(
        buildAdminSmsTemplateBatchInput(
          action,
          selectedTemplateIds,
          action === "move"
            ? Number.parseInt(normalizeSmsTemplateTarget(batchMoveTarget), 10)
            : null,
        ),
      ),
    onSuccess: async (response) => {
      toast.success(`일괄 처리 완료: ${response.result.affected}건`);
      setSelectedTemplateIds([]);
      await invalidateSmsTemplateQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const templates = templateListQuery.data?.templates ?? [];
  const templatePagination = templateListQuery.data?.pagination ?? null;
  const selectedGroup = groupDetailQuery.data?.group ?? null;
  const topError =
    configQuery.error ??
    groupListQuery.error ??
    groupDetailQuery.error ??
    templateListQuery.error ??
    templateDetailQuery.error ??
    createGroupMutation.error ??
    updateGroupMutation.error ??
    deleteGroupMutation.error ??
    moveGroupMutation.error ??
    clearGroupMutation.error ??
    createTemplateMutation.error ??
    updateTemplateMutation.error ??
    deleteTemplateMutation.error ??
    batchMutation.error ??
    null;
  const isBusy =
    createGroupMutation.isPending ||
    updateGroupMutation.isPending ||
    deleteGroupMutation.isPending ||
    moveGroupMutation.isPending ||
    clearGroupMutation.isPending ||
    createTemplateMutation.isPending ||
    updateTemplateMutation.isPending ||
    deleteTemplateMutation.isPending ||
    batchMutation.isPending;
  const availableMoveTargets = groups.filter(
    (group) => group.fg_no !== activeGroupId,
  );

  function handleGroupSubmit(values: AdminSmsTemplateGroupFormValues) {
    if (values.fg_no === null) {
      createGroupMutation.mutate(values);
      return;
    }

    updateGroupMutation.mutate(values);
  }

  function handleTemplateSubmit(values: AdminSmsTemplateFormValues) {
    if (values.fo_no === null) {
      createTemplateMutation.mutate(values);
      return;
    }

    updateTemplateMutation.mutate(values);
  }

  function handleGroupSelect(fgNo: number) {
    setSelectedGroupId(fgNo);
    setSelectedTemplateId(null);
    setSmsTemplateFormGroup(fgNo, templateForm);
  }

  return {
    activeGroupId,
    availableMoveTargets,
    batchMoveTarget,
    batchMutation,
    deleteGroupDialogOpen,
    deleteGroupMutation,
    deleteTemplateDialogOpen,
    deleteTemplateMutation,
    groupForm,
    groupMoveTarget,
    groups,
    handleGroupSelect,
    handleGroupSubmit,
    handleTemplateSubmit,
    isBusy,
    isStorageUnavailable:
      configQuery.isSuccess && !configQuery.data.config.storage_ready,
    isGroupRoute,
    selectedGroup,
    missingTables: configQuery.data?.config.missing_tables ?? [],
    selectedTemplateId,
    selectedTemplateIds,
    search,
    searchField,
    setBatchMoveTarget,
    setDeleteGroupDialogOpen,
    setDeleteTemplateDialogOpen,
    setGroupMoveTarget,
    setSearch,
    setSearchField,
    setSelectedTemplateId,
    setSelectedTemplateIds,
    setTemplatePage,
    templateForm,
    templatePage,
    templatePagination,
    templates,
    topError,
    moveGroupMutation,
    clearGroupMutation,
    groupFormReset: () => {
      groupForm.reset(emptyAdminSmsTemplateGroupFormValues);
      setGroupMoveTarget("");
    },
    templateFormReset: () => {
      setSelectedTemplateId(null);
      templateForm.reset(buildSmsTemplateFormDefaults(activeGroupId));
    },
    toggleTemplateSelection: (templateId: number, checked: boolean) =>
      setSelectedTemplateIds((current) =>
        toggleSmsTemplateSelection(current, templateId, checked),
      ),
  };
}
