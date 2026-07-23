import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authLogin,
  authLogout,
  authStatus,
  type CommandError,
} from "../../api/client";
import type { AuthLoginInput } from "../../types/AuthLoginInput";
import type { AuthSessionState } from "../../types/AuthSessionState";
import { useCurrentSiteId } from "../sites/site-routing";
import { syncSiteCatalogSessionStatus } from "../sites/use-site-catalog";

export function buildAuthStatusKey(siteId: string | null) {
  return ["auth", "status", siteId ?? "none"] as const;
}

export function useAuthSession(options?: { enabled?: boolean }) {
  const siteId = useCurrentSiteId();
  const queryClient = useQueryClient();
  const authStatusKey = buildAuthStatusKey(siteId);
  const enabled = options?.enabled ?? true;

  const sessionQuery = useQuery<AuthSessionState, CommandError>({
    queryKey: authStatusKey,
    queryFn: authStatus,
    retry: false,
    staleTime: 30_000,
    enabled: siteId !== null && enabled,
  });

  const loginMutation = useMutation<AuthSessionState, CommandError, AuthLoginInput>({
    mutationFn: authLogin,
    onSuccess: (session) => {
      queryClient.setQueryData(authStatusKey, session);
      if (siteId) {
        syncSiteCatalogSessionStatus(queryClient, siteId, "authenticated");
      }
    },
  });

  const logoutMutation = useMutation<AuthSessionState, CommandError>({
    mutationFn: authLogout,
    onSuccess: (session) => {
      queryClient.setQueryData(authStatusKey, session);
      if (siteId) {
        syncSiteCatalogSessionStatus(queryClient, siteId, "signed_out");
      }
      queryClient.removeQueries({ queryKey: ["admin"] });
    },
  });

  useEffect(() => {
    if (!siteId || !enabled || !sessionQuery.data) {
      return;
    }

    syncSiteCatalogSessionStatus(
      queryClient,
      siteId,
      sessionQuery.data.authenticated ? "authenticated" : "signed_out",
    );
  }, [enabled, queryClient, sessionQuery.data, siteId]);

  return {
    authenticated: sessionQuery.data?.authenticated === true,
    currentMember: sessionQuery.data?.member ?? null,
    isLoading: sessionQuery.isLoading,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    loginPending: loginMutation.isPending,
    logout: logoutMutation.mutateAsync,
    logoutError: logoutMutation.error,
    logoutPending: logoutMutation.isPending,
    refetchSession: sessionQuery.refetch,
    session: sessionQuery.data,
    sessionError: sessionQuery.error,
  };
}
