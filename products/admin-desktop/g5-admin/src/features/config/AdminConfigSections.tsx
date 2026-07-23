import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { SchemaSectionNavigator } from "../schema/SchemaSectionNavigator";
import { AdminConfigEditorTabContent } from "./AdminConfigEditorTabContent";
import {
  type AdminConfigFieldAccessors,
  type AdminConfigRenderableTab,
  fallbackAdminConfigRenderableTabs,
} from "./admin-config-renderable";
import type { AdminConfigFormValues } from "./admin-config-form";
import { ActionBar } from "./admin-config-field-controls";

export function AdminConfigEditor(props: {
  activeTabId?: string;
  fieldAccessors: AdminConfigFieldAccessors;
  form: UseFormReturn<AdminConfigFormValues>;
  hasChanges: boolean;
  isBusy: boolean;
  onInvalid?: (errors: FieldErrors<AdminConfigFormValues>) => void;
  onReset: () => void;
  onTabChange?: (tabId: string) => void;
  onSubmit: (values: AdminConfigFormValues) => void;
  saveLabel: string;
  tabs: ReadonlyArray<AdminConfigRenderableTab>;
}) {
  const tabs = props.tabs.length > 0 ? props.tabs : fallbackAdminConfigRenderableTabs;

  return (
    <form
      className="config-editor space-y-4"
      noValidate
      onSubmit={props.form.handleSubmit(props.onSubmit, props.onInvalid)}
    >
      <ActionBar
        isBusy={props.isBusy}
        onReset={props.onReset}
        saveDisabled={!props.hasChanges}
        saveLabel={props.saveLabel}
      />

      <SchemaSectionNavigator
        activeSectionKey={props.activeTabId}
        ariaLabel="기본환경설정 섹션"
        layout={{
          desktop: "tabs",
          mobile: "tabs",
          single_open: false,
        }}
        onActiveSectionKeyChange={props.onTabChange}
        sections={tabs.map((tab) => ({
          key: tab.id,
          label: tab.title,
          navigationLabel: tab.navigationTitle,
          description:
            tab.sections.length === 1
              ? tab.sections[0]?.description
              : `${tab.sections.length}개 레거시 하위 섹션`,
          content: (
            <AdminConfigEditorTabContent
              fieldAccessors={props.fieldAccessors}
              form={props.form}
              tab={tab}
            />
          ),
        }))}
      />
    </form>
  );
}
