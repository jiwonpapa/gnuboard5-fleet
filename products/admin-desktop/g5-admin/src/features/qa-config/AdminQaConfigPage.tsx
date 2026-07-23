import { CircleHelp, FileText, Mail, Rows3 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import {
  InfoField,
  TextAreaInputControlField,
  TextInputControlField,
} from "../admin/shared/AdminFormFields";
import {
  qaConfigFieldLabels,
  qaConfigFields,
  qaConfigTextAreaFields,
} from "./admin-qa-config-form";
import { useAdminQaConfigPage } from "./useAdminQaConfigPage";

export function AdminQaConfigPage() {
  const page = useAdminQaConfigPage();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <PageIntro
          kicker="Admin QA Config"
          title="QA 설정"
          description="`/admin/system/qa-config` 단일 리소스를 route-native 화면으로 분리했습니다. 모든 필드는 현재 서버 값을 hydrate한 뒤 변경된 값만 저장합니다."
          icon={CircleHelp}
          metrics={[
            {
              hint: "Q&A 페이지 기본 제목",
              icon: FileText,
              label: "QA 제목",
              value: page.baseline?.qa_title ?? "loading...",
            },
            {
              hint: "문의 메일 기본 수신처",
              icon: Mail,
              label: "관리자 이메일",
              value: page.baseline?.qa_admin_email ?? "loading...",
            },
            {
              hint: "한 페이지 기본 표시 개수",
              icon: Rows3,
              label: "페이지 행 수",
              value: page.baseline?.qa_page_rows ?? "loading...",
            },
          ]}
        />

        {page.error ? <ErrorBanner error={page.error} /> : null}

        <form
          className="space-y-6"
          onSubmit={page.form.handleSubmit(() => {
            if (page.updatePayload) {
              page.updateMutation.mutate(page.updatePayload);
            }
          })}
        >
          <Card>
            <CardHeader>
              <CardTitle>기본 설정 필드</CardTitle>
              <CardDescription>
                스킨, 연락처, 길이, 페이지 수 등 텍스트 기반 설정을 한 화면에서 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {qaConfigFields
                .filter((field) => !qaConfigTextAreaFields.has(field))
                .map((field) => (
                  <TextInputControlField
                    key={field}
                    control={page.form.control}
                    disabled={page.isBusy}
                    label={qaConfigFieldLabels[field]}
                    name={field}
                  />
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>장문/본문 설정</CardTitle>
              <CardDescription>
                본문 기본값, 상하단 include, 모바일 본문 등 장문 필드를 별도로 묶었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {qaConfigFields
                .filter((field) => qaConfigTextAreaFields.has(field))
                .map((field) => (
                  <TextAreaInputControlField
                    key={field}
                    control={page.form.control}
                    disabled={page.isBusy}
                    label={qaConfigFieldLabels[field]}
                    name={field}
                    rows={6}
                  />
                ))}
            </CardContent>
          </Card>
        </form>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>작업 액션</CardTitle>
            <CardDescription>
              저장은 변경된 필드가 있을 때만 활성화됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              disabled={page.isBusy || page.updatePayload === null}
              onClick={page.form.handleSubmit(() => {
                if (page.updatePayload) {
                  page.updateMutation.mutate(page.updatePayload);
                }
              })}
            >
              {page.updateMutation.isPending ? "저장 중..." : "QA 설정 저장"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page.baseline === null || page.isBusy}
              onClick={page.resetToBaseline}
            >
              서버 값으로 되돌리기
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>현재 적용 요약</CardTitle>
            <CardDescription>
              가장 자주 확인하는 설정만 우측 요약 패널에 노출합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoField label="qa_id" value={page.baseline?.qa_id} />
            <InfoField label="제목" value={page.baseline?.qa_title} />
            <InfoField label="카테고리" value={page.baseline?.qa_category} />
            <InfoField label="스킨" value={page.baseline?.qa_skin} />
            <InfoField label="모바일 스킨" value={page.baseline?.qa_mobile_skin} />
            <InfoField label="관리자 이메일" value={page.baseline?.qa_admin_email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
