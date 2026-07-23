import { createHashRouter, Navigate } from "react-router-dom";
import { ActiveSiteRedirect } from "./ActiveSiteRedirect";
import { RouteAliasRedirect } from "./RouteAliasRedirect";
import {
  canonicalAdminChildRoutes,
  canonicalAdminTopLevelRedirects,
  memberDetailChildRoute,
  memberDetailTopLevelRedirect,
  scopedLegacyAdminRedirects,
  toChildPath,
  topLevelLegacyAdminRedirects,
  type AdminRouteRedirect,
} from "./adminRouteRegistry";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedLayout } from "../features/layout/ProtectedLayout";
import {
  DEFAULT_ROUTE,
  SITE_DASHBOARD_ROUTE,
  SITE_ONBOARDING_ROUTE,
  MASTER_SETUP_ROUTE,
  MASTER_UNLOCK_ROUTE,
} from "../features/layout/navigation";
import { MasterSetupPage } from "../features/master/MasterSetupPage";
import { MasterUnlockPage } from "../features/master/MasterUnlockPage";
import { SiteOnboardingPage } from "../features/onboarding/SiteOnboardingPage";
import { SiteActivationPage } from "../features/sites/SiteActivationPage";
import { SiteDashboardPage } from "../features/sites/SiteDashboardPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <ActiveSiteRedirect to={DEFAULT_ROUTE} />,
  },
  {
    path: MASTER_SETUP_ROUTE,
    element: <MasterSetupPage />,
  },
  {
    path: MASTER_UNLOCK_ROUTE,
    element: <MasterUnlockPage />,
  },
  {
    path: SITE_ONBOARDING_ROUTE,
    element: <SiteOnboardingPage />,
  },
  {
    path: "/onboarding",
    element: <Navigate to={SITE_ONBOARDING_ROUTE} replace />,
  },
  {
    path: SITE_DASHBOARD_ROUTE,
    element: <SiteDashboardPage />,
  },
  {
    path: "/login",
    element: <ActiveSiteRedirect to="/login" />,
  },
  {
    path: "/sites/:siteId/activate",
    element: <SiteActivationPage />,
  },
  {
    path: "/sites/:siteId/login",
    element: <LoginPage />,
  },
  {
    path: "/sites/:siteId",
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <Navigate to={toChildPath(DEFAULT_ROUTE)} replace />,
      },
      ...canonicalAdminChildRoutes,
      memberDetailChildRoute,
      ...scopedLegacyAdminRedirects.map(createRouteAliasRedirect),
    ],
  },
  ...canonicalAdminTopLevelRedirects.map(createActiveSiteRedirect),
  createActiveSiteRedirect(memberDetailTopLevelRedirect),
  ...topLevelLegacyAdminRedirects.map(createActiveSiteRedirect),
  {
    path: "*",
    element: <ActiveSiteRedirect to={DEFAULT_ROUTE} />,
  },
]);

function createActiveSiteRedirect(route: AdminRouteRedirect) {
  return {
    path: route.path,
    element: <ActiveSiteRedirect to={route.to} />,
  };
}

function createRouteAliasRedirect(route: AdminRouteRedirect) {
  return {
    path: route.path,
    element: <RouteAliasRedirect to={route.to} />,
  };
}
