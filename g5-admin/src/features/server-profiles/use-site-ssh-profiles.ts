import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addSshProfile,
  deleteSshProfile,
  getSshProfileList,
  type CommandError,
  updateSshProfile,
} from "../../api/client";
import type { SshProfileAddInput } from "../../types/SshProfileAddInput";
import type { SshProfileDeleteInput } from "../../types/SshProfileDeleteInput";
import type { SshProfileListResponse } from "../../types/SshProfileListResponse";
import type { SshProfileUpdateInput } from "../../types/SshProfileUpdateInput";

export function sshProfileListKey(siteId: string | null) {
  return ["sites", "ssh-profiles", siteId] as const;
}

export function useSiteSshProfiles(siteId: string | null) {
  const queryClient = useQueryClient();
  const listQuery = useQuery<SshProfileListResponse, CommandError>({
    queryKey: sshProfileListKey(siteId),
    queryFn: () => getSshProfileList({ site_id: siteId ?? "" }),
    enabled: siteId !== null,
    staleTime: 30_000,
  });

  const sync = (response: SshProfileListResponse) => {
    queryClient.setQueryData(sshProfileListKey(response.site_id), response);
  };

  const addMutation = useMutation<SshProfileListResponse, CommandError, SshProfileAddInput>({
    mutationFn: addSshProfile,
    onSuccess: sync,
  });
  const updateMutation = useMutation<
    SshProfileListResponse,
    CommandError,
    SshProfileUpdateInput
  >({
    mutationFn: updateSshProfile,
    onSuccess: sync,
  });
  const deleteMutation = useMutation<
    SshProfileListResponse,
    CommandError,
    SshProfileDeleteInput
  >({
    mutationFn: deleteSshProfile,
    onSuccess: sync,
  });

  return {
    addProfile: addMutation.mutateAsync,
    addProfileError: addMutation.error,
    addProfilePending: addMutation.isPending,
    deleteProfile: deleteMutation.mutateAsync,
    deleteProfileError: deleteMutation.error,
    deleteProfilePending: deleteMutation.isPending,
    isLoading: listQuery.isLoading,
    profiles: listQuery.data?.profiles ?? [],
    refetchProfiles: listQuery.refetch,
    response: listQuery.data,
    responseError: listQuery.error,
    updateProfile: updateMutation.mutateAsync,
    updateProfileError: updateMutation.error,
    updateProfilePending: updateMutation.isPending,
  };
}
