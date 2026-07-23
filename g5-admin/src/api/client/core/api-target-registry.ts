import { contentFaqSystemApiTargetsByCommand } from "./api-target-registry-groups/content-faq-system";
import { localApiTargetsByCommand } from "./api-target-registry-groups/local";
import { mailMenuThemeApiTargetsByCommand } from "./api-target-registry-groups/mail-menu-theme";
import { membersBoardsApiTargetsByCommand } from "./api-target-registry-groups/members-boards";
import { operationsApiTargetsByCommand } from "./api-target-registry-groups/operations";
import { smsDebugApiTargetsByCommand } from "./api-target-registry-groups/sms-debug";

// Extracted from resolveApiTarget so API/local targets live in grouped registries.
export const apiTargetsByCommand: Readonly<Record<string, string>> = {
  ...localApiTargetsByCommand,
  ...contentFaqSystemApiTargetsByCommand,
  ...mailMenuThemeApiTargetsByCommand,
  ...membersBoardsApiTargetsByCommand,
  ...operationsApiTargetsByCommand,
  ...smsDebugApiTargetsByCommand,
};

export const apiTargetCommands = Object.freeze(Object.keys(apiTargetsByCommand));
