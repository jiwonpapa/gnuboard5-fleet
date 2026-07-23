import type { AdminSchemaSection } from "../../types/AdminSchemaSection";
import {
  adminConfigExtraFlagFieldNames,
  adminConfigExtraSections,
  adminConfigExtraTextFieldNames,
  type AdminConfigExtraFlagFieldName,
  type AdminConfigExtraTextFieldName,
} from "./config-field-meta";
import type { AdminConfigFormValues } from "./admin-config-form";
import { toSchemaFallbackLabel } from "./admin-config-schema-label";

type TextFieldName = Extract<
  keyof Omit<AdminConfigFormValues, "extraFlags" | "extraTexts">,
  string
>;

type TextFieldConfig = {
  fallbackLabel: string;
  name: TextFieldName;
  placeholder?: string;
};

type BooleanFieldConfig = {
  fallbackLabel: string;
  name: TextFieldName;
};

export type AdminConfigRenderableField =
  | ({ kind: "text" } & TextFieldConfig)
  | ({ kind: "boolean" } & BooleanFieldConfig)
  | {
      fallbackLabel: string;
      kind: "extra-text";
      name: AdminConfigExtraTextFieldName;
    }
  | {
      fallbackLabel: string;
      kind: "extra-boolean";
      name: AdminConfigExtraFlagFieldName;
    };

export type AdminConfigRenderableSection = {
  description: string;
  fields: ReadonlyArray<AdminConfigRenderableField>;
  id: string;
  navigationTitle?: string;
  title: string;
};

export type AdminConfigRenderableTab = {
  id: string;
  navigationTitle?: string;
  sections: ReadonlyArray<AdminConfigRenderableSection>;
  title: string;
};

export type AdminConfigFieldAccessors = {
  compact: (name: string) => boolean;
  description: (name: string) => string | undefined;
  inputType: (name: string) => string | undefined;
  label: (name: string, fallback: string) => string;
  options: (name: string) => Array<{ label: string; value: string }> | undefined;
  renderAsExtraText: (field: AdminConfigExtraTextFieldName) => "input" | "textarea";
  readonly: (name: string) => boolean;
  required: (name: string) => boolean;
  suffix: (name: string) => string | undefined;
};

const siteInfoFields: readonly TextFieldConfig[] = [
  { fallbackLabel: "사이트 제목", name: "cf_title", placeholder: "사이트 제목" },
  { fallbackLabel: "최고관리자", name: "cf_admin", placeholder: "admin" },
  {
    fallbackLabel: "관리자 이메일",
    name: "cf_admin_email",
    placeholder: "admin@example.com",
  },
  { fallbackLabel: "관리자 이름", name: "cf_admin_email_name", placeholder: "운영자" },
  { fallbackLabel: "에디터", name: "cf_editor", placeholder: "smarteditor2" },
  { fallbackLabel: "새글 스킨", name: "cf_new_skin", placeholder: "basic" },
  { fallbackLabel: "검색 스킨", name: "cf_search_skin", placeholder: "basic" },
  { fallbackLabel: "접속자 스킨", name: "cf_connect_skin", placeholder: "basic" },
  { fallbackLabel: "FAQ 스킨", name: "cf_faq_skin", placeholder: "basic" },
  { fallbackLabel: "회원 스킨", name: "cf_member_skin", placeholder: "basic" },
  {
    fallbackLabel: "모바일 회원 스킨",
    name: "cf_mobile_member_skin",
    placeholder: "basic",
  },
];

const policyPointFields: readonly TextFieldConfig[] = [
  { fallbackLabel: "가입 기본 레벨", name: "cf_register_level" },
  { fallbackLabel: "가입 포인트", name: "cf_register_point" },
  { fallbackLabel: "로그인 포인트", name: "cf_login_point" },
  { fallbackLabel: "글쓰기 포인트", name: "cf_write_point" },
  { fallbackLabel: "댓글 포인트", name: "cf_comment_point" },
  { fallbackLabel: "다운로드 포인트", name: "cf_download_point" },
  { fallbackLabel: "읽기 포인트", name: "cf_read_point" },
  { fallbackLabel: "쪽지 발송 포인트", name: "cf_memo_send_point" },
  { fallbackLabel: "캡차", name: "cf_captcha", placeholder: "kcaptcha" },
];

const policyToggleFields: readonly BooleanFieldConfig[] = [
  { fallbackLabel: "포인트 사용", name: "cf_use_point" },
  { fallbackLabel: "이메일 인증 사용", name: "cf_use_email_certify" },
  { fallbackLabel: "홈페이지 입력 사용", name: "cf_use_homepage" },
  { fallbackLabel: "홈페이지 입력 필수", name: "cf_req_homepage" },
  { fallbackLabel: "전화 입력 사용", name: "cf_use_tel" },
  { fallbackLabel: "전화 입력 필수", name: "cf_req_tel" },
  { fallbackLabel: "휴대폰 입력 사용", name: "cf_use_hp" },
  { fallbackLabel: "휴대폰 입력 필수", name: "cf_req_hp" },
  { fallbackLabel: "주소 입력 사용", name: "cf_use_addr" },
  { fallbackLabel: "주소 입력 필수", name: "cf_req_addr" },
  { fallbackLabel: "소셜 로그인 사용", name: "cf_social_login_use" },
];

const textFieldConfigByName = new Map<TextFieldName, TextFieldConfig>(
  [...siteInfoFields, ...policyPointFields].map((field) => [field.name, field]),
);

const booleanFieldConfigByName = new Map<TextFieldName, BooleanFieldConfig>(
  policyToggleFields.map((field) => [field.name, field]),
);

const fallbackSections = [
  createRenderableSection({
    description: "사이트 제목, 관리자 메일, 기본 스킨과 에디터를 설정합니다.",
    fieldNames: siteInfoFields.map((field) => field.name),
    id: "site-info",
    title: "사이트/관리자 정보",
  }),
  createRenderableSection({
    description: "가입 기본값과 포인트, 입력 필수 정책을 관리합니다.",
    fieldNames: [
      ...policyPointFields.map((field) => field.name),
      ...policyToggleFields.map((field) => field.name),
    ],
    id: "policy",
    title: "회원/포인트 정책",
  }),
  ...adminConfigExtraSections.map((section) =>
    createRenderableSection({
      description: section.description,
      fieldNames: section.fields,
      id: section.id,
      title: section.title,
    }),
  ),
].filter((section): section is AdminConfigRenderableSection => section !== null);

const legacyConfigSectionOrder: ReadonlyArray<{
  fallbackFieldNames?: ReadonlyArray<string>;
  id: string;
  sectionKeys: ReadonlyArray<string>;
  tabLabel: string;
}> = [
  { id: "anc_cf_basic", sectionKeys: ["anc_cf_basic"], tabLabel: "기본환경" },
  { id: "anc_cf_board", sectionKeys: ["anc_cf_board"], tabLabel: "게시판기본" },
  { id: "anc_cf_join", sectionKeys: ["anc_cf_join"], tabLabel: "회원가입" },
  { id: "anc_cf_cert", sectionKeys: ["anc_cf_cert"], tabLabel: "본인확인" },
  {
    fallbackFieldNames: ["cf_bbs_rewrite"],
    id: "anc_cf_url",
    sectionKeys: ["anc_cf_url"],
    tabLabel: "짧은주소",
  },
  {
    id: "anc_cf_mail_bundle",
    sectionKeys: [
      "anc_cf_mail",
      "anc_cf_article_mail",
      "anc_cf_join_mail",
      "anc_cf_vote_mail",
    ],
    tabLabel: "메일",
  },
  { id: "anc_cf_sns", sectionKeys: ["anc_cf_sns"], tabLabel: "SNS" },
  { id: "anc_cf_lay", sectionKeys: ["anc_cf_lay"], tabLabel: "레이아웃 추가설정" },
  { id: "anc_cf_sms", sectionKeys: ["anc_cf_sms"], tabLabel: "SMS" },
  { id: "anc_cf_extra", sectionKeys: ["anc_cf_extra"], tabLabel: "여분필드" },
] as const;

const legacyPinnedSectionByFieldName: Partial<Record<string, string>> = {
  cf_admin: "anc_cf_basic",
  cf_bbs_rewrite: "anc_cf_url",
};

export const fallbackAdminConfigRenderableTabs = fallbackSections.map((section) => ({
  id: section.id,
  navigationTitle: section.navigationTitle,
  sections: [section],
  title: section.title,
}));

export function resolveAdminConfigRenderableSections(
  sections: ReadonlyArray<AdminSchemaSection> | null | undefined,
): AdminConfigRenderableTab[] {
  if (!sections || sections.length === 0) {
    return fallbackAdminConfigRenderableTabs;
  }

  const sectionsByKey = new Map(sections.map((section) => [section.key, section]));
  const resolved = legacyConfigSectionOrder.reduce<AdminConfigRenderableTab[]>(
    (tabs, definition) => {
      const resolvedSections = definition.sectionKeys
        .map((sectionKey) => {
          const schemaSection = sectionsByKey.get(sectionKey);
          const fieldNames =
            schemaSection?.fields
              .map((field) => field.name)
              .filter((fieldName) => {
                const pinnedSectionKey = legacyPinnedSectionByFieldName[fieldName];
                return pinnedSectionKey === undefined || pinnedSectionKey === sectionKey;
              }) ??
            (sectionKey === definition.id ? definition.fallbackFieldNames ?? [] : []);

          return createRenderableSection({
            description: schemaSection?.description ?? "",
            fieldNames,
            id: sectionKey,
            title: schemaSection?.label ?? definition.tabLabel,
          });
        })
        .filter((section): section is AdminConfigRenderableSection => section !== null);

      if (resolvedSections.length === 0) {
        return tabs;
      }

      tabs.push({
        id: definition.id,
        navigationTitle: definition.tabLabel,
        sections: resolvedSections,
        title: definition.tabLabel,
      });
      return tabs;
    },
    [],
  );

  return resolved.length > 0 ? resolved : fallbackAdminConfigRenderableTabs;
}

function createRenderableSection(props: {
  description: string;
  fieldNames: ReadonlyArray<string>;
  id: string;
  navigationTitle?: string;
  title: string;
}): AdminConfigRenderableSection | null {
  const fields = props.fieldNames
    .map((name) => resolveRenderableField(name))
    .filter((field): field is AdminConfigRenderableField => field !== null);

  if (fields.length === 0) {
    return null;
  }

  return {
    description: props.description,
    fields,
    id: props.id,
    navigationTitle: props.navigationTitle,
    title: props.title,
  };
}

function resolveRenderableField(name: string): AdminConfigRenderableField | null {
  const textField = textFieldConfigByName.get(name as TextFieldName);
  if (textField) {
    return { kind: "text", ...textField };
  }

  const booleanField = booleanFieldConfigByName.get(name as TextFieldName);
  if (booleanField) {
    return { kind: "boolean", ...booleanField };
  }

  if ((adminConfigExtraTextFieldNames as readonly string[]).includes(name)) {
    return {
      fallbackLabel: toSchemaFallbackLabel(name),
      kind: "extra-text",
      name: name as AdminConfigExtraTextFieldName,
    };
  }

  if ((adminConfigExtraFlagFieldNames as readonly string[]).includes(name)) {
    return {
      fallbackLabel: toSchemaFallbackLabel(name),
      kind: "extra-boolean",
      name: name as AdminConfigExtraFlagFieldName,
    };
  }

  return null;
}
