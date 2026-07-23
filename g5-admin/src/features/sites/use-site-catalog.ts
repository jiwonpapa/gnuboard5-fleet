import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addSite,
  deleteSite,
  getSiteCatalog,
  healthCheckSite,
  switchSite,
  updateSite,
  type CommandError,
} from "../../api/client";
import type { SiteAddInput } from "../../types/SiteAddInput";
import type { SiteCatalog } from "../../types/SiteCatalog";
import type { SiteDeleteInput } from "../../types/SiteDeleteInput";
import type { SiteHealthCheckInput } from "../../types/SiteHealthCheckInput";
import type { SiteHealthCheckResult } from "../../types/SiteHealthCheckResult";
import type { SiteSessionStatus } from "../../types/SiteSessionStatus";
import type { SiteSwitchInput } from "../../types/SiteSwitchInput";
import type { SiteUpdateInput } from "../../types/SiteUpdateInput";

export const siteCatalogKey = ["sites", "catalog"] as const;

export function useSiteCatalog(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;

  const catalogQuery = useQuery<SiteCatalog, CommandError>({
    queryKey: siteCatalogKey,
    queryFn: getSiteCatalog,
    staleTime: 30_000,
    enabled,
  });

  const addMutation = useMutation<SiteCatalog, CommandError, SiteAddInput>({
    mutationFn: addSite,
    onSuccess: (catalog) => {
      syncCatalog(queryClient, catalog);
    },
  });

  const switchMutation = useMutation<SiteCatalog, CommandError, SiteSwitchInput>({
    mutationFn: switchSite,
    onSuccess: (catalog) => {
      syncCatalog(queryClient, catalog);
    },
  });

  const updateMutation = useMutation<SiteCatalog, CommandError, SiteUpdateInput>({
    mutationFn: updateSite,
    onSuccess: (catalog) => {
      syncCatalog(queryClient, catalog);
    },
  });

  const deleteMutation = useMutation<SiteCatalog, CommandError, SiteDeleteInput>({
    mutationFn: deleteSite,
    onSuccess: (catalog) => {
      syncCatalog(queryClient, catalog);
    },
  });

  const healthMutation = useMutation<SiteHealthCheckResult, CommandError, SiteHealthCheckInput>({
    mutationFn: healthCheckSite,
  });

  return {
    addSite: addMutation.mutateAsync,
    addSiteError: addMutation.error,
    addSitePending: addMutation.isPending,
    catalog: catalogQuery.data,
    catalogError: catalogQuery.error,
    deleteSite: deleteMutation.mutateAsync,
    deleteSiteError: deleteMutation.error,
    deleteSitePending: deleteMutation.isPending,
    healthCheckSite: healthMutation.mutateAsync,
    healthCheckSiteError: healthMutation.error,
    healthCheckSitePending: healthMutation.isPending,
    healthCheckSiteResult: healthMutation.data,
    isLoading: catalogQuery.isLoading,
    refetchCatalog: catalogQuery.refetch,
    switchSite: switchMutation.mutateAsync,
    switchSiteError: switchMutation.error,
    switchSitePending: switchMutation.isPending,
    updateSite: updateMutation.mutateAsync,
    updateSiteError: updateMutation.error,
    updateSitePending: updateMutation.isPending,
  };
}

function syncCatalog(queryClient: ReturnType<typeof useQueryClient>, catalog: SiteCatalog) {
  queryClient.setQueryData(siteCatalogKey, catalog);
  queryClient.removeQueries({
    predicate: (query) => {
      const [scope] = query.queryKey;
      return scope === "admin" || scope === "auth";
    },
  });
}

export function syncSiteCatalogSessionStatus(
  queryClient: QueryClient,
  siteId: string,
  status: SiteSessionStatus,
) {
  queryClient.setQueryData<SiteCatalog | undefined>(siteCatalogKey, (catalog) => {
    if (!catalog) {
      return catalog;
    }

    let changed = false;
    const nextSites = catalog.sites.map((entry) => {
      if (entry.site.id !== siteId || entry.status === status) {
        return entry;
      }

      changed = true;
      return {
        ...entry,
        status,
      };
    });

    if (!changed) {
      return catalog;
    }

    return {
      ...catalog,
      sites: nextSites,
    };
  });
}
