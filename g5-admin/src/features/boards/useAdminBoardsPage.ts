import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAdminBoard,
  copyAdminBoard,
  deleteAdminBoardNewPosts,
  deleteAdminBoard,
  getAdminBoard,
  getAdminBoardList,
  updateAdminBoard,
  type CommandError,
} from "../../api/client";
import {
  boardFormSchema,
  buildBoardCreateInput,
  buildBoardUpdateInput,
  emptyBoardFormValues,
  toBoardFormValues,
  type BoardFormValues,
} from "./admin-boards-form";
import type { AdminBoard } from "../../types/AdminBoard";
import type { AdminBoardDetailResponse } from "../../types/AdminBoardDetailResponse";
import type { AdminBoardListResponse } from "../../types/AdminBoardListResponse";

const boardsPerPage = 20;

export function useAdminBoardsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState<string | null>(null);
  const [selectedBoardTable, setSelectedBoardTable] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBoard | null>(null);
  const [copyTargetTable, setCopyTargetTable] = useState("");
  const [copyTargetSubject, setCopyTargetSubject] = useState("");
  const [newPostIdsText, setNewPostIdsText] = useState("");

  const createForm = useForm<BoardFormValues>({
    defaultValues: emptyBoardFormValues(),
    resolver: zodResolver(boardFormSchema),
  });
  const editForm = useForm<BoardFormValues>({
    defaultValues: emptyBoardFormValues(),
    resolver: zodResolver(boardFormSchema),
  });
  const emptyValues = emptyBoardFormValues();
  const createWatched = useWatch({ control: createForm.control });
  const editWatched = useWatch({ control: editForm.control });

  const createValues = {
    ...emptyValues,
    ...(createWatched ?? {}),
    extraFlags: {
      ...emptyValues.extraFlags,
      ...(createWatched?.extraFlags ?? {}),
    },
    extraTexts: {
      ...emptyValues.extraTexts,
      ...(createWatched?.extraTexts ?? {}),
    },
  };
  const editValues = {
    ...emptyValues,
    ...(editWatched ?? {}),
    extraFlags: {
      ...emptyValues.extraFlags,
      ...(editWatched?.extraFlags ?? {}),
    },
    extraTexts: {
      ...emptyValues.extraTexts,
      ...(editWatched?.extraTexts ?? {}),
    },
  };

  const boardsQuery = useQuery<AdminBoardListResponse, CommandError>({
    queryFn: () =>
      getAdminBoardList({
        page,
        per_page: boardsPerPage,
        search: submittedSearch,
      }),
    queryKey: ["admin", "boards", "list", page, submittedSearch ?? ""],
    retry: false,
  });

  useEffect(() => {
    const boards = boardsQuery.data?.boards ?? [];

    if (boards.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Async list hydration must clear stale board selection when the current page has no rows.
      setSelectedBoardTable(null);
      return;
    }

    const hasSelected =
      selectedBoardTable !== null &&
      boards.some((board) => board.bo_table === selectedBoardTable);

    if (!hasSelected) {
      setSelectedBoardTable(boards[0].bo_table);
    }
  }, [boardsQuery.data, selectedBoardTable]);

  const boardDetailQuery = useQuery<AdminBoardDetailResponse, CommandError>({
    enabled: selectedBoardTable !== null,
    queryFn: () => getAdminBoard(selectedBoardTable ?? ""),
    queryKey: ["admin", "boards", "detail", selectedBoardTable ?? ""],
    retry: false,
  });

  useEffect(() => {
    editForm.reset(toBoardFormValues(boardDetailQuery.data?.board));
  }, [boardDetailQuery.data, editForm]);

  const createMutation = useMutation<
    AdminBoardDetailResponse,
    CommandError,
    BoardFormValues
  >({
    mutationFn: async (values) =>
      createAdminBoard(buildBoardCreateInput(values)!),
    onSuccess: async (response) => {
      createForm.reset(emptyBoardFormValues());
      setSubmittedSearch(null);
      setSearchInput("");
      setPage(1);
      setSelectedBoardTable(response.board.bo_table);
      queryClient.setQueryData(
        ["admin", "boards", "detail", response.board.bo_table],
        response,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "boards", "list"] });
      toast.success("게시판을 생성했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation<
    AdminBoardDetailResponse,
    CommandError,
    BoardFormValues
  >({
    mutationFn: async (values) =>
      updateAdminBoard(buildBoardUpdateInput(boardDetailQuery.data!.board, values)!),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        ["admin", "boards", "detail", response.board.bo_table],
        response,
      );
      editForm.reset(toBoardFormValues(response.board));
      await queryClient.invalidateQueries({ queryKey: ["admin", "boards", "list"] });
      toast.success("게시판을 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminBoard,
    onSuccess: async () => {
      const deletedKey = deleteTarget?.bo_table ?? selectedBoardTable ?? "";
      setDeleteTarget(null);
      setSelectedBoardTable(null);
      queryClient.removeQueries({ queryKey: ["admin", "boards", "detail", deletedKey] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "boards", "list"] });
      toast.success("게시판을 삭제했습니다.");
    },
    onError: (error: CommandError) => {
      toast.error(error.message);
    },
  });

  const copyMutation = useMutation({
    mutationFn: copyAdminBoard,
    onSuccess: async (response) => {
      setCopyTargetTable("");
      setCopyTargetSubject("");
      setSelectedBoardTable(response.board.bo_table);
      queryClient.setQueryData(
        ["admin", "boards", "detail", response.board.bo_table],
        response,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "boards", "list"] });
      toast.success("게시판을 복사했습니다.");
    },
    onError: (error: CommandError) => {
      toast.error(error.message);
    },
  });

  const newPostsDeleteMutation = useMutation({
    mutationFn: deleteAdminBoardNewPosts,
    onSuccess: (response) => {
      setNewPostIdsText("");
      toast.success(`새글 캐시 ${response.result.deleted ?? 0}건을 삭제했습니다.`);
    },
    onError: (error: CommandError) => {
      toast.error(error.message);
    },
  });

  const selectedBoard = boardDetailQuery.data?.board ?? null;

  return {
    boardDetailQuery,
    boards: boardsQuery.data?.boards ?? [],
    createForm,
    createMutation,
    createPayload: buildBoardCreateInput(createValues),
    deleteMutation,
    deleteTarget,
    editForm,
    error:
      boardsQuery.error ??
      boardDetailQuery.error ??
      (createMutation.error instanceof Error && !("request_id" in createMutation.error)
        ? null
        : (createMutation.error as CommandError | null)) ??
      (updateMutation.error instanceof Error && !("request_id" in updateMutation.error)
        ? null
        : (updateMutation.error as CommandError | null)) ??
      copyMutation.error ??
      newPostsDeleteMutation.error ??
      deleteMutation.error ??
      null,
    isBusy:
      boardsQuery.isLoading ||
      boardsQuery.isFetching ||
      boardDetailQuery.isFetching ||
      createMutation.isPending ||
      copyMutation.isPending ||
      newPostsDeleteMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    copyMutation,
    copyTargetSubject,
    copyTargetTable,
    page,
    pagination: boardsQuery.data?.pagination,
    searchInput,
    selectedBoard,
    selectedBoardTable,
    setDeleteTarget,
    setPage,
    setSearchInput,
    setSelectedBoardTable,
    setSubmittedSearch,
    setCopyTargetSubject,
    setCopyTargetTable,
    setNewPostIdsText,
    submittedSearch,
    newPostIdsText,
    newPostsDeleteMutation,
    submitSearch() {
      setPage(1);
      setSubmittedSearch(normalizeSearch(searchInput));
    },
    resetEdit() {
      editForm.reset(toBoardFormValues(selectedBoard));
    },
    updateMutation,
    updatePayload:
      selectedBoard === null ? null : buildBoardUpdateInput(selectedBoard, editValues),
  };
}

function normalizeSearch(value: string) {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}
