import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  addAdminBoardGroupMember,
  createAdminBoardGroup,
  deleteAdminBoardGroup,
  deleteAdminBoardGroupMember,
  getAdminBoardGroup,
  getAdminBoardGroupList,
  getAdminBoardGroupMembers,
  type CommandError,
  updateAdminBoardGroup,
} from "../../api/client";
import type { AdminBoardGroupDetailResponse } from "../../types/AdminBoardGroupDetailResponse";
import type { AdminBoardGroupListResponse } from "../../types/AdminBoardGroupListResponse";
import type { AdminBoardGroupMemberListResponse } from "../../types/AdminBoardGroupMemberListResponse";
import type { AdminBoardGroupMemberResponse } from "../../types/AdminBoardGroupMemberResponse";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import {
  getFieldDescription,
  getFieldLabel,
  getFieldOptions,
  useAdminFieldSchema,
} from "../schema/useAdminFieldSchema";
import {
  adminBoardGroupFormSchema,
  adminBoardGroupMemberFormSchema,
  buildAdminBoardGroupCreateInput,
  buildAdminBoardGroupMemberAddInput,
  buildAdminBoardGroupUpdateInput,
  emptyAdminBoardGroupFormValues,
  emptyAdminBoardGroupMemberFormValues,
  type AdminBoardGroupFormValues,
  type AdminBoardGroupMemberFormValues,
} from "./admin-board-groups-form";
import {
  type DeleteMemberTarget,
  invalidateBoardGroupMembers,
  invalidateBoardGroupQueries,
} from "./admin-board-groups-page-helpers";

export function useAdminBoardGroupsWorkspace() {
  const queryClient = useQueryClient();
  const groupSchemaQuery = useAdminFieldSchema("groups");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearchInput, setMemberSearchInput] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<DeleteMemberTarget>(null);

  const groupForm = useForm<AdminBoardGroupFormValues>({
    defaultValues: emptyAdminBoardGroupFormValues,
    resolver: zodResolver(adminBoardGroupFormSchema),
  });
  const memberForm = useForm<AdminBoardGroupMemberFormValues>({
    defaultValues: emptyAdminBoardGroupMemberFormValues,
    resolver: zodResolver(adminBoardGroupMemberFormSchema),
  });

  const listQuery = useQuery<AdminBoardGroupListResponse, CommandError>({
    queryKey: ["admin", "board-groups", "list"],
    queryFn: () => getAdminBoardGroupList(),
    retry: false,
  });

  const detailQuery = useQuery<AdminBoardGroupDetailResponse, CommandError>({
    enabled: selectedGroupId !== null,
    queryKey: ["admin", "board-groups", "detail", selectedGroupId],
    queryFn: () => getAdminBoardGroup(selectedGroupId!),
    retry: false,
  });

  const membersQuery = useQuery<AdminBoardGroupMemberListResponse, CommandError>({
    enabled: selectedGroupId !== null,
    queryKey: ["admin", "board-groups", "members", selectedGroupId, memberPage, memberSearch],
    queryFn: () =>
      getAdminBoardGroupMembers({
        gr_id: selectedGroupId!,
        page: memberPage,
        per_page: 20,
        search: memberSearch.length > 0 ? memberSearch : null,
      }),
    retry: false,
  });

  const createMutation = useMutation<
    AdminBoardGroupDetailResponse,
    CommandError,
    AdminBoardGroupFormValues
  >({
    mutationFn: async (values) =>
      createAdminBoardGroup(buildAdminBoardGroupCreateInput(values)),
    onSuccess: async (response) => {
      toast.success(`게시판 그룹 ${response.group.gr_id}를 생성했습니다.`);
      setSelectedGroupId(response.group.gr_id);
      await invalidateBoardGroupQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation<
    AdminBoardGroupDetailResponse,
    CommandError,
    AdminBoardGroupFormValues
  >({
    mutationFn: async (values) =>
      updateAdminBoardGroup(buildAdminBoardGroupUpdateInput(values)),
    onSuccess: async (response) => {
      toast.success(`게시판 그룹 ${response.group.gr_id}를 수정했습니다.`);
      await invalidateBoardGroupQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminBoardGroup({ gr_id: selectedGroupId! }),
    onSuccess: async () => {
      toast.success(`게시판 그룹 ${selectedGroupId}를 삭제했습니다.`);
      setDeleteGroupOpen(false);
      resetGroupSelection();
      await invalidateBoardGroupQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const addMemberMutation = useMutation<
    AdminBoardGroupMemberResponse,
    CommandError,
    AdminBoardGroupMemberFormValues
  >({
    mutationFn: async (values) =>
      addAdminBoardGroupMember(buildAdminBoardGroupMemberAddInput(selectedGroupId!, values)),
    onSuccess: async (response) => {
      toast.success(`${response.result.mb_id} 회원을 그룹에 추가했습니다.`);
      memberForm.reset(emptyAdminBoardGroupMemberFormValues);
      await invalidateBoardGroupMembers(queryClient, selectedGroupId);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: () => deleteAdminBoardGroupMember(deleteMemberTarget!),
    onSuccess: async () => {
      toast.success(`${deleteMemberTarget?.mb_id} 회원을 그룹에서 제거했습니다.`);
      setDeleteMemberTarget(null);
      await invalidateBoardGroupMembers(queryClient, selectedGroupId);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  useEffect(() => {
    if (detailQuery.data?.group) {
      groupForm.reset({
        gr_id: detailQuery.data.group.gr_id,
        gr_subject: detailQuery.data.group.gr_subject ?? "",
        gr_admin: detailQuery.data.group.gr_admin ?? "",
        gr_device:
          detailQuery.data.group.gr_device === "pc" ||
          detailQuery.data.group.gr_device === "mobile"
            ? detailQuery.data.group.gr_device
            : "both",
        gr_use_access: (detailQuery.data.group.gr_use_access ?? 0) === 1,
      });
      return;
    }

    if (selectedGroupId === null) {
      groupForm.reset(emptyAdminBoardGroupFormValues);
    }
  }, [detailQuery.data?.group, groupForm, selectedGroupId]);

  const groupFieldSchema = groupSchemaQuery.data?.schema ?? null;
  const groupFieldLabel = (name: string, fallback: string) =>
    getFieldLabel(groupFieldSchema, name, fallback);
  const groupFieldDescription = (name: string) => getFieldDescription(groupFieldSchema, name);
  const groupDeviceOptions =
    getFieldOptions(groupFieldSchema, "gr_device").length > 0
      ? getFieldOptions(groupFieldSchema, "gr_device")
      : [
          { label: "PC/모바일 공통", value: "both" },
          { label: "PC 전용", value: "pc" },
          { label: "모바일 전용", value: "mobile" },
        ];
  const hasGroupSchemaState = hasFieldSchemaState({
    error: groupSchemaQuery.error ?? null,
    loading: groupSchemaQuery.isLoading || groupSchemaQuery.isFetching,
    schema: groupFieldSchema,
  });

  const topError =
    listQuery.error ??
    detailQuery.error ??
    membersQuery.error ??
    createMutation.error ??
    updateMutation.error ??
    deleteMutation.error ??
    addMemberMutation.error ??
    deleteMemberMutation.error ??
    null;
  const groups = listQuery.data?.groups ?? [];
  const members = membersQuery.data?.members ?? [];
  const memberPagination = membersQuery.data?.pagination ?? null;
  const selectedGroup = detailQuery.data?.group ?? null;
  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    addMemberMutation.isPending ||
    deleteMemberMutation.isPending;

  function resetGroupSelection() {
    setSelectedGroupId(null);
    setMemberPage(1);
    setMemberSearch("");
    setMemberSearchInput("");
    groupForm.reset(emptyAdminBoardGroupFormValues);
  }

  function handleGroupSelect(groupId: string) {
    setSelectedGroupId(groupId);
    setMemberPage(1);
    setMemberSearch("");
    setMemberSearchInput("");
  }

  function handleGroupSubmit(values: AdminBoardGroupFormValues) {
    if (selectedGroupId === null) {
      createMutation.mutate(values);
      return;
    }

    updateMutation.mutate(values);
  }

  return {
    addMemberMutation,
    deleteGroupOpen,
    deleteMemberMutation,
    deleteMemberTarget,
    detailQuery,
    groupDeviceOptions,
    groupFieldDescription,
    groupFieldLabel,
    groupFieldSchema,
    groupForm,
    groupSchemaQuery,
    groups,
    handleGroupSelect,
    handleGroupSubmit,
    hasGroupSchemaState,
    isBusy,
    listQuery,
    memberForm,
    memberPage,
    memberPagination,
    memberSearchInput,
    members,
    membersQuery,
    resetGroupSelection,
    selectedGroup,
    selectedGroupId,
    setDeleteGroupOpen,
    setDeleteMemberTarget,
    setMemberPage,
    setMemberSearch,
    setMemberSearchInput,
    topError,
    deleteMutation,
  };
}
