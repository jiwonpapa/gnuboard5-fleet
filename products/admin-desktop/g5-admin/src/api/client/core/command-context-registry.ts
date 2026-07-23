// Extracted from the former buildCommandContext switch so command metadata lives in one registry.
import { contentFaqSystemCommandContextBuilders } from "./command-context-builders/content-faq-system";
import { localCommandContextBuilders } from "./command-context-builders/local";
import { mailMenuThemeCommandContextBuilders } from "./command-context-builders/mail-menu-theme";
import { membersBoardsCommandContextBuilders } from "./command-context-builders/members-boards";
import { operationsCommandContextBuilders } from "./command-context-builders/operations";
import { smsDebugCommandContextBuilders } from "./command-context-builders/sms-debug";

export type {
  CommandContextBuilder,
  CommandContextTemplate,
  CommandPayload,
} from "./command-context-builders/shared";

export const commandContextBuilders = Object.freeze({
  ...localCommandContextBuilders,
  ...contentFaqSystemCommandContextBuilders,
  ...mailMenuThemeCommandContextBuilders,
  ...membersBoardsCommandContextBuilders,
  ...operationsCommandContextBuilders,
  ...smsDebugCommandContextBuilders,
});

export const commandContextCommands = Object.freeze(
  Object.keys(commandContextBuilders)
);
