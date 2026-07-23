import type { NavigationGroup } from "../navigation-types";
import { appSettingsNavigationGroup, overviewNavigationGroup, siteManagementNavigationGroup } from "./core";
import { environmentNavigationGroup } from "./environment";
import { membersNavigationGroup } from "./members";
import { boardsNavigationGroup } from "./boards";
import { serverNavigationGroup } from "./server";
import { smsNavigationGroup } from "./sms";
import { toolsNavigationGroup } from "./tools";

export const navigationGroups: NavigationGroup[] = [
  overviewNavigationGroup,
  appSettingsNavigationGroup,
  siteManagementNavigationGroup,
  serverNavigationGroup,
  environmentNavigationGroup,
  membersNavigationGroup,
  boardsNavigationGroup,
  smsNavigationGroup,
  toolsNavigationGroup,
];
