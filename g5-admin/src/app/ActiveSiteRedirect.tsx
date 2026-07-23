import { Navigate, useLocation, useParams } from "react-router-dom";
import { resolveAppEntryPath } from "../features/master/master-flow";
import { useMasterLock } from "../features/master/use-master-lock";
import { useSiteCatalog } from "../features/sites/use-site-catalog";

export function ActiveSiteRedirect(props: {
  to: string | ((params: Record<string, string | undefined>) => string);
}) {
  const location = useLocation();
  const params = useParams<Record<string, string | undefined>>();
  const masterLock = useMasterLock();
  const siteCatalog = useSiteCatalog({
    enabled: masterLock.status?.is_unlocked === true,
  });

  if (masterLock.isLoading || (masterLock.status?.is_unlocked && siteCatalog.isLoading)) {
    return null;
  }

  const targetPath = typeof props.to === "function" ? props.to(params) : props.to;
  const nextPath = resolveAppEntryPath(masterLock.status, siteCatalog.catalog, targetPath);

  return (
    <Navigate
      replace
      to={{
        pathname: nextPath,
        search: location.search,
      }}
    />
  );
}
