import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  deleteAdminMember,
  deleteAdminMemberIcon,
  deleteAdminMemberImage,
  getAdminMember,
  getAdminMemberList,
  uploadAdminMemberIcon,
  uploadAdminMemberImage,
  updateAdminMember,
  updateAdminMemberLevel,
  type CommandError,
} from "../../api/client";
import type { AdminMemberDetailResponse } from "../../types/AdminMemberDetailResponse";
import type { AdminMemberListResponse } from "../../types/AdminMemberListResponse";
import type { AdminMemberMediaResponse } from "../../types/AdminMemberMediaResponse";
import type { AdminMemberUpdateInput } from "../../types/AdminMemberUpdateInput";
import { useAuthSession } from "../auth/use-auth-session";
import { useAdminFieldSchema } from "../schema/useAdminFieldSchema";
import {
  buildAdminMemberUpdateInput,
  emptyAdminMemberFormValues,
  toAdminMemberFormValues,
  type AdminMemberFormValues,
} from "./admin-members-form";
import {
  adminMemberFormSchema,
  adminMembersPerPage,
  navigateToMembers,
  normalizeSearch,
  parsePositiveInteger,
  syncMemberDetail,
} from "./admin-members-page-helpers";

export function useAdminMembersWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const memberSchemaQuery = useAdminFieldSchema("members");
  const params = useParams();
  const [searchParams] = useSearchParams();

  const selectedMemberId = params.mbId ?? null;
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const search = normalizeSearch(searchParams.get("search"));

  const form = useForm<AdminMemberFormValues>({
    resolver: zodResolver(adminMemberFormSchema),
    defaultValues: emptyAdminMemberFormValues,
  });

  const membersQuery = useQuery<AdminMemberListResponse, CommandError>({
    queryKey: ["admin", "members", "route", "list", page, search ?? ""],
    queryFn: () =>
      getAdminMemberList({
        page,
        per_page: adminMembersPerPage,
        search,
      }),
    retry: false,
  });

  const detailQuery = useQuery<AdminMemberDetailResponse, CommandError>({
    queryKey: ["admin", "members", "route", "detail", selectedMemberId ?? ""],
    queryFn: () => getAdminMember(selectedMemberId ?? ""),
    enabled: selectedMemberId !== null,
    retry: false,
  });

  useEffect(() => {
    if (!detailQuery.data?.member) {
      form.reset(emptyAdminMemberFormValues);
      return;
    }

    form.reset(toAdminMemberFormValues(detailQuery.data.member));
  }, [detailQuery.data, form]);

  const watchedValues = useWatch({ control: form.control });
  const formValues: AdminMemberFormValues = {
    ...emptyAdminMemberFormValues,
    ...watchedValues,
  };

  const selectedMember = detailQuery.data?.member ?? null;
  const currentMember = session.currentMember;
  const currentMemberLevel = currentMember?.mb_level ?? 10;
  const selectedMemberLevel = selectedMember?.mb_level ?? 0;
  const isSelfSelected =
    currentMember?.mb_id !== undefined && currentMember.mb_id === selectedMember?.mb_id;
  const isTopAdminSelected = selectedMember?.mb_level === 10;
  const isHigherLevelSelected = selectedMemberLevel > currentMemberLevel;
  const maxAssignableLevel = Math.max(1, currentMemberLevel);
  const profilePayload = selectedMember
    ? buildAdminMemberUpdateInput(selectedMember, formValues)
    : null;
  const canDeleteMember =
    selectedMember !== null &&
    !isSelfSelected &&
    !isTopAdminSelected &&
    !isHigherLevelSelected;
  const canSaveProfile =
    selectedMember !== null && profilePayload !== null && !isHigherLevelSelected;

  const levelMutation = useMutation<
    AdminMemberDetailResponse,
    CommandError,
    { mb_id: string; mb_level: number }
  >({
    mutationFn: updateAdminMemberLevel,
    onSuccess: (response) => {
      syncMemberDetail(queryClient, response);
      toast.success(`${response.member.mb_id} 레벨을 저장했습니다.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "members", "route", "list"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const profileMutation = useMutation<
    AdminMemberDetailResponse,
    CommandError,
    AdminMemberUpdateInput
  >({
    mutationFn: updateAdminMember,
    onSuccess: (response) => {
      syncMemberDetail(queryClient, response);
      form.reset(toAdminMemberFormValues(response.member));
      toast.success(`${response.member.mb_id} 프로필을 저장했습니다.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "members", "route", "list"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminMember,
    onSuccess: (_, variables) => {
      toast.success(`${variables.mb_id} 회원을 삭제했습니다.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "members", "route", "list"] });
      void navigateToMembers(navigate, { page, search });
    },
    onError: (error: CommandError) => {
      toast.error(error.message);
    },
  });

  const iconUploadMutation = useMutation<
    AdminMemberMediaResponse,
    CommandError,
    { bytes: number[]; file_name: string; mime_type: string | null; mb_id: string }
  >({
    mutationFn: uploadAdminMemberIcon,
    onSuccess: (response) => {
      toast.success(`${response.media.mb_id} 아이콘을 저장했습니다.`);
      void detailQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const iconDeleteMutation = useMutation<AdminMemberMediaResponse, CommandError, string>({
    mutationFn: deleteAdminMemberIcon,
    onSuccess: (response) => {
      toast.success(`${response.media.mb_id} 아이콘을 삭제했습니다.`);
      void detailQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const imageUploadMutation = useMutation<
    AdminMemberMediaResponse,
    CommandError,
    { bytes: number[]; file_name: string; mime_type: string | null; mb_id: string }
  >({
    mutationFn: uploadAdminMemberImage,
    onSuccess: (response) => {
      toast.success(`${response.media.mb_id} 이미지를 저장했습니다.`);
      void detailQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const imageDeleteMutation = useMutation<AdminMemberMediaResponse, CommandError, string>({
    mutationFn: deleteAdminMemberImage,
    onSuccess: (response) => {
      toast.success(`${response.media.mb_id} 이미지를 삭제했습니다.`);
      void detailQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const topError =
    session.sessionError ??
    membersQuery.error ??
    profileMutation.error ??
    levelMutation.error ??
    iconUploadMutation.error ??
    iconDeleteMutation.error ??
    imageUploadMutation.error ??
    imageDeleteMutation.error ??
    deleteMutation.error ??
    null;
  const pagination = membersQuery.data?.pagination;
  const listBusy = membersQuery.isLoading || membersQuery.isFetching;
  const mutationBusy =
    levelMutation.isPending ||
    profileMutation.isPending ||
    deleteMutation.isPending ||
    iconUploadMutation.isPending ||
    iconDeleteMutation.isPending ||
    imageUploadMutation.isPending ||
    imageDeleteMutation.isPending;

  function goNextPage() {
    void navigateToMembers(navigate, { page: page + 1, search });
  }

  function goPrevPage() {
    void navigateToMembers(navigate, { page: Math.max(1, page - 1), search });
  }

  function resetSearch() {
    void navigateToMembers(navigate, { page: 1, search: null });
  }

  function searchMembers(nextSearch: string | null) {
    void navigateToMembers(navigate, { page: 1, search: nextSearch });
  }

  function selectMember(mbId: string) {
    void navigateToMembers(navigate, { mbId, page, search });
  }

  function handleDeleteConfirm() {
    if (!selectedMember) {
      return;
    }

    deleteMutation.mutate({ mb_id: selectedMember.mb_id });
  }

  function handleSubmitProfile() {
    if (!profilePayload) {
      toast("변경된 회원 정보가 없습니다.");
      return;
    }
    profileMutation.mutate(profilePayload);
  }

  function handleSubmitLevel(level: number) {
    if (!selectedMember) {
      return;
    }
    levelMutation.mutate({ mb_id: selectedMember.mb_id, mb_level: level });
  }

  function handleDeleteIcon() {
    if (!selectedMember) {
      return;
    }
    iconDeleteMutation.mutate(selectedMember.mb_id);
  }

  function handleDeleteImage() {
    if (!selectedMember) {
      return;
    }
    imageDeleteMutation.mutate(selectedMember.mb_id);
  }

  function handleUploadIcon(payload: {
    bytes: number[];
    file_name: string;
    mime_type: string | null;
  }) {
    if (!selectedMember) {
      return;
    }
    iconUploadMutation.mutate({ ...payload, mb_id: selectedMember.mb_id });
  }

  function handleUploadImage(payload: {
    bytes: number[];
    file_name: string;
    mime_type: string | null;
  }) {
    if (!selectedMember) {
      return;
    }
    imageUploadMutation.mutate({ ...payload, mb_id: selectedMember.mb_id });
  }

  return {
    canDeleteMember,
    canSaveProfile,
    currentMember,
    deleteMutation,
    detailQuery,
    form,
    goNextPage,
    goPrevPage,
    handleDeleteConfirm,
    handleDeleteIcon,
    handleDeleteImage,
    handleSubmitLevel,
    handleSubmitProfile,
    handleUploadIcon,
    handleUploadImage,
    iconDeleteMutation,
    iconUploadMutation,
    imageDeleteMutation,
    imageUploadMutation,
    isTopAdminSelected,
    levelMutation,
    listBusy,
    maxAssignableLevel,
    memberSchemaQuery,
    membersQuery,
    mutationBusy,
    page,
    pagination,
    profileMutation,
    profilePayload,
    resetSearch,
    search,
    searchMembers,
    selectMember,
    selectedMember,
    selectedMemberId,
    topError,
  };
}
