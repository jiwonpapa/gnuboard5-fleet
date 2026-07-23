import type { CommandError } from "../../api/client";
import type { AdminSchemaDetail } from "../../types/AdminSchemaDetail";
import { ErrorBanner } from "../shared/ErrorBanner";
import { SelectionPlaceholder } from "../shared/SelectionPlaceholder";

export function FieldSchemaStatePanel(props: {
  error: CommandError | null;
  hiddenTargetLabel: string;
  loading: boolean;
  noun: string;
  schema: AdminSchemaDetail | null;
}) {
  if (props.error) {
    return (
      <div className="space-y-3">
        <ErrorBanner error={props.error} />
        <p className="text-sm leading-6 break-words text-muted-foreground">
          화면 구성을 불러오지 못해 {props.hiddenTargetLabel}을 잠시 숨겼습니다.
          잠시 후 다시 시도해 주십시오.
        </p>
      </div>
    );
  }

  return (
    <SelectionPlaceholder
      description={`${props.noun} 화면 구성을 불러오는 중입니다.`}
    />
  );
}
