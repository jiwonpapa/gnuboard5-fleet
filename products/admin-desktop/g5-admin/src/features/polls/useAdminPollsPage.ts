import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAdminPoll,
  deleteAdminPoll,
  getAdminPoll,
  getAdminPollList,
  updateAdminPoll,
  type CommandError,
} from "../../api/client";
import {
  buildPollCreateInput,
  buildPollUpdateInput,
  emptyPollFormValues,
  pollFormSchema,
  toPollFormValues,
  type PollFormValues,
} from "./admin-polls-form";
import type { AdminPoll } from "../../types/AdminPoll";
import type { AdminPollDetailResponse } from "../../types/AdminPollDetailResponse";
import type { AdminPollListResponse } from "../../types/AdminPollListResponse";

const pollsPerPage = 20;

export function useAdminPollsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPoll | null>(null);

  const createForm = useForm<PollFormValues>({
    defaultValues: emptyPollFormValues(),
    resolver: zodResolver(pollFormSchema),
  });
  const editForm = useForm<PollFormValues>({
    defaultValues: emptyPollFormValues(),
    resolver: zodResolver(pollFormSchema),
  });

  const createValues = {
    ...emptyPollFormValues(),
    ...(useWatch({ control: createForm.control }) ?? {}),
  };
  const editValues = {
    ...emptyPollFormValues(),
    ...(useWatch({ control: editForm.control }) ?? {}),
  };

  const pollsQuery = useQuery<AdminPollListResponse, CommandError>({
    queryFn: () =>
      getAdminPollList({
        page,
        per_page: pollsPerPage,
      }),
    queryKey: ["admin", "polls", "list", page],
    retry: false,
  });

  useEffect(() => {
    const polls = pollsQuery.data?.polls ?? [];

    if (polls.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Async list hydration must clear stale poll selection when the current page has no rows.
      setSelectedPollId(null);
      return;
    }

    const hasSelected =
      selectedPollId !== null &&
      polls.some((poll) => poll.po_id === selectedPollId);

    if (!hasSelected) {
      setSelectedPollId(polls[0].po_id);
    }
  }, [pollsQuery.data, selectedPollId]);

  const pollDetailQuery = useQuery<AdminPollDetailResponse, CommandError>({
    enabled: selectedPollId !== null,
    queryFn: () => getAdminPoll(selectedPollId ?? 0),
    queryKey: ["admin", "polls", "detail", selectedPollId ?? 0],
    retry: false,
  });

  useEffect(() => {
    editForm.reset(toPollFormValues(pollDetailQuery.data?.poll));
  }, [editForm, pollDetailQuery.data]);

  const createMutation = useMutation<
    AdminPollDetailResponse,
    CommandError,
    PollFormValues
  >({
    mutationFn: async (values) => createAdminPoll(buildPollCreateInput(values)!),
    onSuccess: async (response) => {
      createForm.reset(emptyPollFormValues());
      setSelectedPollId(response.poll.po_id);
      queryClient.setQueryData(
        ["admin", "polls", "detail", response.poll.po_id],
        response,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "polls", "list"] });
      toast.success("투표를 생성했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation<
    AdminPollDetailResponse,
    CommandError,
    PollFormValues
  >({
    mutationFn: async (values) =>
      updateAdminPoll(buildPollUpdateInput(pollDetailQuery.data!.poll, values)!),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        ["admin", "polls", "detail", response.poll.po_id],
        response,
      );
      editForm.reset(toPollFormValues(response.poll));
      await queryClient.invalidateQueries({ queryKey: ["admin", "polls", "list"] });
      toast.success("투표를 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminPoll,
    onSuccess: async () => {
      const deletedId = deleteTarget?.po_id ?? selectedPollId ?? 0;
      setDeleteTarget(null);
      setSelectedPollId(null);
      queryClient.removeQueries({ queryKey: ["admin", "polls", "detail", deletedId] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "polls", "list"] });
      toast.success("투표를 삭제했습니다.");
    },
    onError: (error: CommandError) => {
      toast.error(error.message);
    },
  });

  const selectedPoll = pollDetailQuery.data?.poll ?? null;

  return {
    createForm,
    createMutation,
    createPayload: buildPollCreateInput(createValues),
    deleteMutation,
    deleteTarget,
    detailLoading: pollDetailQuery.isLoading,
    editForm,
    error:
      pollsQuery.error ??
      pollDetailQuery.error ??
      (createMutation.error instanceof Error && !("request_id" in createMutation.error)
        ? null
        : (createMutation.error as CommandError | null)) ??
      (updateMutation.error instanceof Error && !("request_id" in updateMutation.error)
        ? null
        : (updateMutation.error as CommandError | null)) ??
      deleteMutation.error ??
      null,
    isBusy:
      pollsQuery.isLoading ||
      pollsQuery.isFetching ||
      pollDetailQuery.isFetching ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    page,
    pagination: pollsQuery.data?.pagination,
    polls: pollsQuery.data?.polls ?? [],
    selectedPoll,
    selectedPollId,
    setDeleteTarget,
    setPage,
    setSelectedPollId,
    resetEdit() {
      editForm.reset(toPollFormValues(selectedPoll));
    },
    updateMutation,
    updatePayload:
      selectedPoll === null ? null : buildPollUpdateInput(selectedPoll, editValues),
  };
}
