import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  createAdminContent,
  deleteAdminContent,
  getAdminContent,
  getAdminContentList,
  updateAdminContent,
  type CommandError,
} from "../../api/client";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import {
  getFieldDescription,
  getFieldLabel,
  useAdminFieldSchema,
} from "../schema/useAdminFieldSchema";
import {
  adminContentFormSchema,
  buildAdminContentCreateInput,
  buildAdminContentListQuery,
  buildAdminContentUpdateInput,
  emptyAdminContentFormValues,
  type AdminContentFormValues,
} from "./admin-contents-form";

export function useAdminContentsWorkspace() {
  const queryClient = useQueryClient();
  const contentSchemaQuery = useAdminFieldSchema("contents");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const form = useForm<AdminContentFormValues>({
    defaultValues: emptyAdminContentFormValues,
    resolver: zodResolver(adminContentFormSchema),
  });

  const listQuery = useQuery<
    Awaited<ReturnType<typeof getAdminContentList>>,
    CommandError
  >({
    queryKey: ["admin", "contents", page, appliedSearch],
    queryFn: () =>
      getAdminContentList(buildAdminContentListQuery(appliedSearch, page, 20)),
    retry: false,
  });

  const detailQuery = useQuery<
    Awaited<ReturnType<typeof getAdminContent>>,
    CommandError
  >({
    queryKey: ["admin", "contents", "detail", selectedContentId],
    queryFn: () => getAdminContent(selectedContentId ?? ""),
    retry: false,
    enabled: selectedContentId !== null,
  });

  useEffect(() => {
    const content = detailQuery.data?.content;
    if (!content) {
      return;
    }

    form.reset({
      co_id: content.co_id,
      co_subject: content.co_subject,
      co_html: content.co_html > 0,
      co_content: content.co_content,
      co_mobile_content: content.co_mobile_content,
      co_include_head: content.co_include_head ?? "",
      co_include_tail: content.co_include_tail ?? "",
      co_tag_filter_use: (content.co_tag_filter_use ?? 1) === 1,
      co_skin: content.co_skin ?? "",
      co_mobile_skin: content.co_mobile_skin ?? "",
    });
  }, [detailQuery.data?.content, form]);

  const createMutation = useMutation({
    mutationFn: async (values: AdminContentFormValues) =>
      createAdminContent(buildAdminContentCreateInput(values)),
    onSuccess: async (response) => {
      toast.success(`${response.content.co_id} 내용을 생성했습니다.`);
      setSelectedContentId(response.content.co_id);
      await invalidateContentQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: AdminContentFormValues) =>
      updateAdminContent(buildAdminContentUpdateInput(values)),
    onSuccess: async (response) => {
      toast.success(`${response.content.co_id} 내용을 수정했습니다.`);
      await invalidateContentQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminContent({ co_id: selectedContentId ?? "" }),
    onSuccess: async () => {
      toast.success("내용 항목을 삭제했습니다.");
      setSelectedContentId(null);
      setDeleteDialogOpen(false);
      form.reset(emptyAdminContentFormValues);
      await invalidateContentQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const topError =
    listQuery.error ??
    detailQuery.error ??
    createMutation.error ??
    updateMutation.error ??
    deleteMutation.error ??
    null;
  const contents = listQuery.data?.contents ?? [];
  const pagination = listQuery.data?.pagination ?? null;
  const selectedContent = detailQuery.data?.content ?? null;
  const contentFieldSchema = contentSchemaQuery.data?.schema ?? null;
  const contentFieldLabel = (name: string, fallback: string) =>
    getFieldLabel(contentFieldSchema, name, fallback);
  const contentFieldDescription = (name: string) =>
    getFieldDescription(contentFieldSchema, name);
  const isEditing = selectedContentId !== null;
  const hasContentSchemaState = hasFieldSchemaState({
    error: contentSchemaQuery.error ?? null,
    loading: contentSchemaQuery.isLoading || contentSchemaQuery.isFetching,
    schema: contentFieldSchema,
  });
  const isBusy =
    listQuery.isFetching ||
    detailQuery.isFetching ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  function handleSearchSubmit() {
    setPage(1);
    setAppliedSearch(search.trim());
  }

  function handleResetSearch() {
    setSearch("");
    setAppliedSearch("");
    setPage(1);
  }

  function handleResetContent() {
    setSelectedContentId(null);
    form.reset(emptyAdminContentFormValues);
  }

  function handleSubmit() {
    const values = form.getValues();
    if (isEditing) {
      void updateMutation.mutateAsync(values);
      return;
    }
    void createMutation.mutateAsync(values);
  }

  function handleConfirmDelete() {
    void deleteMutation.mutateAsync();
  }

  return {
    appliedSearch,
    contentFieldDescription,
    contentFieldLabel,
    contentFieldSchema,
    contentSchemaQuery,
    contents,
    deleteDialogOpen,
    deleteMutation,
    form,
    handleConfirmDelete,
    handleResetContent,
    handleResetSearch,
    handleSearchSubmit,
    handleSubmit,
    hasContentSchemaState,
    isBusy,
    isEditing,
    page,
    pagination,
    search,
    selectedContent,
    selectedContentId,
    setDeleteDialogOpen,
    setPage,
    setSearch,
    setSelectedContentId,
    topError,
  };
}

async function invalidateContentQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "contents"] }),
  ]);
}
