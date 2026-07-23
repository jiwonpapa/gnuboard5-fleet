import { operationsAccessCommandContextBuilders } from "./operations/access";
import { operationsEngagementCommandContextBuilders } from "./operations/engagement";
import { operationsPointCommandContextBuilders } from "./operations/points";
import { operationsReportPushCommandContextBuilders } from "./operations/report-push";

export const operationsCommandContextBuilders = Object.freeze({
  ...operationsReportPushCommandContextBuilders,
  ...operationsAccessCommandContextBuilders,
  ...operationsPointCommandContextBuilders,
  ...operationsEngagementCommandContextBuilders,
});
