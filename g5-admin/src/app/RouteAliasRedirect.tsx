import { Navigate, useLocation, useParams } from "react-router-dom";
import { buildSiteRoute } from "../features/layout/navigation";

export function RouteAliasRedirect(props: {
  to: string | ((params: Record<string, string | undefined>) => string);
}) {
  const location = useLocation();
  const params = useParams<Record<string, string | undefined>>();
  const rawTargetPath = typeof props.to === "function" ? props.to(params) : props.to;
  const targetPath =
    params.siteId && rawTargetPath.startsWith("/")
      ? buildSiteRoute(params.siteId, rawTargetPath)
      : rawTargetPath;

  return (
    <Navigate
      replace
      to={{
        pathname: targetPath,
        search: location.search,
      }}
    />
  );
}
