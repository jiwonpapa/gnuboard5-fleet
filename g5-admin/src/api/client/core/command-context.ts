import { resolveApiTarget } from "./api-targets";
import {
  commandContextBuilders,
  type CommandContextTemplate,
  type CommandPayload,
} from "./command-context-registry";

export type CommandContext = CommandContextTemplate & {
  apiTarget: string;
  command: string;
};

export function buildCommandContext(
  command: string,
  payload?: CommandPayload
): CommandContext {
  const template = commandContextBuilders[command]?.(payload);

  return withApiTarget(command, {
    area: template?.area ?? "Unknown",
    command,
    localTarget: template?.localTarget,
    operation: template?.operation ?? command,
  });
}

function withApiTarget(
  command: string,
  context: Omit<CommandContext, "apiTarget">
): CommandContext {
  return {
    ...context,
    apiTarget: resolveApiTarget(command),
  };
}
