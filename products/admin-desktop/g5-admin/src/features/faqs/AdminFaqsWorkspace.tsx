import { CircleHelp, Image, Layers3 } from "lucide-react";
import { PageIntro } from "../layout/PageIntro";
import { ErrorBanner } from "../shared/ErrorBanner";
import { FaqDialogs } from "./FaqDialogs";
import { FaqItemsSection } from "./FaqItemsSection";
import { FaqMasterSection } from "./FaqMasterSection";
import { useAdminFaqsWorkspace } from "./use-admin-faqs-workspace";

export function AdminFaqsWorkspace() {
  const model = useAdminFaqsWorkspace();

  return (
    <>
      <div className="space-y-6">
        <PageIntro
          kicker="Admin FAQ"
          title="FAQ관리"
          description="FAQ 마스터와 FAQ 문항, 헤더/푸터 이미지까지 route-native 한 화면에서 관리합니다. 선택한 마스터 기준으로 문항 목록이 동기화됩니다."
          icon={CircleHelp}
          metrics={[
              {
                hint: "현재 페이지 기준 FAQ 마스터 수",
                icon: Layers3,
                label: "마스터",
                value: String(model.masterPagination?.total ?? 0),
              },
              {
                hint: "선택 마스터 기준 FAQ 문항 수",
                icon: CircleHelp,
                label: "문항",
                value: String(model.selectedMaster?.faq_count ?? 0),
              },
              {
                hint: "선택 마스터의 이미지 상태",
                icon: Image,
                label: "이미지",
                value:
                  model.selectedMaster?.header_image.exists ||
                  model.selectedMaster?.footer_image.exists
                    ? "있음"
                    : "없음",
              },
            ]}
        />

        {model.topError ? <ErrorBanner error={model.topError} /> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <FaqMasterSection
            hasSchemaState={model.hasMasterSchemaState}
            imageActionsBusy={
              model.isBusy ||
              model.uploadHeaderMutation.isPending ||
              model.deleteHeaderMutation.isPending ||
              model.uploadFooterMutation.isPending ||
              model.deleteFooterMutation.isPending
            }
            isBusy={model.isBusy}
            masterForm={model.masterForm}
            masterPage={model.masterPage}
            masters={model.masters}
            masterPagination={model.masterPagination}
            onDeleteFooterImage={() => void model.deleteFooterMutation.mutateAsync()}
            onDeleteHeaderImage={() => void model.deleteHeaderMutation.mutateAsync()}
            onDeleteMaster={() => void model.deleteMasterMutation.mutateAsync()}
            onMasterDeleteDialogOpen={() => model.setDeleteMasterDialogOpen(true)}
            onMasterPageNext={() => model.setMasterPage((current) => current + 1)}
            onMasterPagePrev={() => model.setMasterPage((current) => Math.max(1, current - 1))}
            onMasterReset={model.resetMaster}
            onMasterSelect={model.selectMaster}
            onMasterSubmit={model.handleMasterSubmit}
            onSelectFooterImage={(file) => void model.uploadFooterMutation.mutateAsync(file)}
            onSelectHeaderImage={(file) => void model.uploadHeaderMutation.mutateAsync(file)}
            schemaError={model.masterSchemaError}
            schemaLoading={model.masterSchemaLoading}
            schemaNoun="FAQ 마스터"
            schema={model.masterFieldSchema}
            selectedMaster={model.selectedMaster}
            selectedMasterId={model.selectedMasterId}
            fieldDescription={model.masterFieldDescription}
            fieldLabel={model.masterFieldLabel}
          />

          <FaqItemsSection
            faqForm={model.faqForm}
            faqPage={model.faqPage}
            faqPagination={model.faqPagination}
            faqs={model.faqs}
            hasSchemaState={model.hasFaqSchemaState}
            isBusy={model.isBusy}
            onFaqDeleteDialogOpen={() => model.setDeleteFaqDialogOpen(true)}
            onFaqPageNext={() => model.setFaqPage((current) => current + 1)}
            onFaqPagePrev={() => model.setFaqPage((current) => Math.max(1, current - 1))}
            onFaqReset={model.resetFaq}
            onFaqSelect={model.setSelectedFaqId}
            onFaqSubmit={model.handleFaqSubmit}
            schemaError={model.faqSchemaError}
            schemaLoading={model.faqSchemaLoading}
            schemaNoun="FAQ 문항"
            schema={model.faqFieldSchema}
            selectedFaqId={model.selectedFaqId}
            selectedMasterId={model.selectedMasterId}
            fieldDescription={model.faqFieldDescription}
            fieldLabel={model.faqFieldLabel}
          />
        </div>
      </div>

      <FaqDialogs
        deleteFaqDialogOpen={model.deleteFaqDialogOpen}
        deleteFaqPending={model.deleteFaqMutation.isPending}
        deleteMasterDialogOpen={model.deleteMasterDialogOpen}
        deleteMasterPending={model.deleteMasterMutation.isPending}
        onDeleteFaqCancel={() => model.setDeleteFaqDialogOpen(false)}
        onDeleteFaqConfirm={() => {
          void model.deleteFaqMutation.mutateAsync();
        }}
        onDeleteMasterCancel={() => model.setDeleteMasterDialogOpen(false)}
        onDeleteMasterConfirm={() => {
          void model.deleteMasterMutation.mutateAsync();
        }}
      />
    </>
  );
}
