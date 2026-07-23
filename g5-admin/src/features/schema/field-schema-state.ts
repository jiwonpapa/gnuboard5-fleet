import type { CommandError } from "../../api/client";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";

export function hasFieldSchemaState(props: {
  error: CommandError | null;
  loading: boolean;
  schema: AdminSchemaDetail | null;
}) {
  return props.error !== null || props.loading || props.schema === null;
}
