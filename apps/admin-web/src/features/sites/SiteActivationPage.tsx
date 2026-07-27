import { Navigate, useParams } from "react-router-dom";

export function SiteActivationPage() {
  const { siteId } = useParams();
  if (!siteId) {
    return <Navigate replace to="/sites" />;
  }
  return <Navigate replace to={`/sites/${encodeURIComponent(siteId)}`} />;
}
