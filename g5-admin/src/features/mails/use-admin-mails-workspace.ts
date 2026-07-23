import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createAdminMailTemplate,
  deleteAdminMailTemplate,
  getAdminMailRecipients,
  getAdminMailTemplate,
  getAdminMailTemplateList,
  sendAdminMail,
  type CommandError,
  updateAdminMailTemplate,
} from "../../api/client";
import type { AdminMailDetailResponse } from "../../types/AdminMailDetailResponse";
import type { AdminMailListResponse } from "../../types/AdminMailListResponse";
import type { AdminMailRecipientListResponse } from "../../types/AdminMailRecipientListResponse";
import type { AdminMailSendResponse } from "../../types/AdminMailSendResponse";
import {
  adminMailComposeFormSchema,
  adminMailTemplateFormSchema,
  buildAdminMailRecipientQuery,
  buildAdminMailSendInput,
  buildAdminMailTemplateCreateInput,
  buildAdminMailTemplateUpdateInput,
  emptyAdminMailComposeFormValues,
  emptyAdminMailTemplateFormValues,
  type AdminMailComposeFormValues,
  type AdminMailTemplateFormValues,
} from "./admin-mails-form";
import { EMPTY_RECIPIENTS, invalidateMailQueries } from "./admin-mails-page-helpers";

export function useAdminMailsWorkspace() {
  const queryClient = useQueryClient();
  const [templatePage, setTemplatePage] = useState(1);
  const [recipientPage, setRecipientPage] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appliedComposeValues, setAppliedComposeValues] =
    useState<AdminMailComposeFormValues>(emptyAdminMailComposeFormValues);

  const templateForm = useForm<AdminMailTemplateFormValues>({
    defaultValues: emptyAdminMailTemplateFormValues,
    resolver: zodResolver(adminMailTemplateFormSchema),
  });
  const composeForm = useForm<AdminMailComposeFormValues>({
    defaultValues: emptyAdminMailComposeFormValues,
    resolver: zodResolver(adminMailComposeFormSchema),
  });

  const targetType =
    useWatch({
      control: composeForm.control,
      name: "target_type",
    }) ?? emptyAdminMailComposeFormValues.target_type;
  const dryRun =
    useWatch({
      control: composeForm.control,
      name: "dry_run",
    }) ?? emptyAdminMailComposeFormValues.dry_run;
  const useSelectedTemplate =
    useWatch({
      control: composeForm.control,
      name: "use_selected_template",
    }) ?? emptyAdminMailComposeFormValues.use_selected_template;

  const previewQuery = useMemo(
    () => buildAdminMailRecipientQuery(appliedComposeValues, recipientPage, 20),
    [appliedComposeValues, recipientPage],
  );

  const templateListQuery = useQuery<AdminMailListResponse, CommandError>({
    queryKey: ["admin", "mails", "templates", templatePage],
    queryFn: () => getAdminMailTemplateList({ page: templatePage, per_page: 10 }),
    retry: false,
  });
  const templateDetailQuery = useQuery<AdminMailDetailResponse, CommandError>({
    enabled: selectedTemplateId !== null,
    queryKey: ["admin", "mails", "template", selectedTemplateId],
    queryFn: () => getAdminMailTemplate(selectedTemplateId!),
    retry: false,
  });
  const recipientListQuery = useQuery<AdminMailRecipientListResponse, CommandError>({
    queryKey: ["admin", "mails", "recipients", previewQuery],
    queryFn: () => getAdminMailRecipients(previewQuery),
    retry: false,
  });

  const createMutation = useMutation<
    AdminMailDetailResponse,
    CommandError,
    AdminMailTemplateFormValues
  >({
    mutationFn: async (values) =>
      createAdminMailTemplate(buildAdminMailTemplateCreateInput(values)!),
    onSuccess: async (response) => {
      toast.success(`템플릿 #${response.mail.ma_id}를 생성했습니다.`);
      setSelectedTemplateId(response.mail.ma_id);
      await invalidateMailQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = useMutation<
    AdminMailDetailResponse,
    CommandError,
    AdminMailTemplateFormValues
  >({
    mutationFn: async (values) =>
      updateAdminMailTemplate(
        buildAdminMailTemplateUpdateInput(selectedTemplateId!, values)!,
      ),
    onSuccess: async (response) => {
      toast.success(`템플릿 #${response.mail.ma_id}를 수정했습니다.`);
      await invalidateMailQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminMailTemplate({ ma_id: selectedTemplateId! }),
    onSuccess: async () => {
      toast.success(`템플릿 #${selectedTemplateId}를 삭제했습니다.`);
      setDeleteDialogOpen(false);
      setSelectedTemplateId(null);
      templateForm.reset(emptyAdminMailTemplateFormValues);
      await invalidateMailQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const sendMutation = useMutation<
    AdminMailSendResponse,
    CommandError,
    AdminMailComposeFormValues
  >({
    mutationFn: async (values) =>
      sendAdminMail(
        buildAdminMailSendInput(values, {
          selectedMemberIds: selectedRecipientIds,
          selectedTemplateId,
        })!,
      ),
    onSuccess: async (response) => {
      const action = response.result.dry_run ? "드라이런" : "발송";
      toast.success(
        `${action} 완료: 대상 ${response.result.target_count}명, 성공 ${response.result.sent_count}명`,
      );
      await invalidateMailQueries(queryClient);
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (templateDetailQuery.data?.mail) {
      templateForm.reset({
        ma_subject: templateDetailQuery.data.mail.ma_subject ?? "",
        ma_content: templateDetailQuery.data.mail.ma_content ?? "",
      });
      return;
    }

    if (selectedTemplateId === null) {
      templateForm.reset(emptyAdminMailTemplateFormValues);
    }
  }, [selectedTemplateId, templateDetailQuery.data?.mail, templateForm]);

  const topError =
    templateListQuery.error ??
    templateDetailQuery.error ??
    recipientListQuery.error ??
    createMutation.error ??
    updateMutation.error ??
    deleteMutation.error ??
    sendMutation.error ??
    null;
  const templates = templateListQuery.data?.mails ?? [];
  const templatePagination = templateListQuery.data?.pagination ?? null;
  const recipients = recipientListQuery.data?.recipients ?? EMPTY_RECIPIENTS;
  const recipientPagination = recipientListQuery.data?.pagination ?? null;
  const selectedTemplate = templateDetailQuery.data?.mail ?? null;
  const latestSendResult = sendMutation.data?.result ?? null;
  const visibleRecipientIds = useMemo(
    () => recipients.map((recipient) => recipient.mb_id),
    [recipients],
  );
  const estimatedTargets =
    targetType === "member"
      ? selectedRecipientIds.length
      : (recipientPagination?.total ?? 0);
  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    sendMutation.isPending;

  function handleTemplateSubmit() {
    const values = templateForm.getValues();
    if (selectedTemplateId === null) {
      const payload = buildAdminMailTemplateCreateInput(values);
      if (payload === null) {
        toast.error("템플릿 입력값을 다시 확인해 주십시오.");
        return;
      }
      createMutation.mutate(values);
      return;
    }

    const payload = buildAdminMailTemplateUpdateInput(selectedTemplateId, values);
    if (payload === null) {
      toast.error("템플릿 입력값을 다시 확인해 주십시오.");
      return;
    }
    updateMutation.mutate(values);
  }

  function handleComposeSubmit() {
    const values = composeForm.getValues();
    const payload = buildAdminMailSendInput(values, {
      selectedMemberIds: selectedRecipientIds,
      selectedTemplateId,
    });
    if (payload === null) {
      toast.error(
        "발송 조건이 부족합니다. 템플릿 또는 제목/본문, 그리고 대상 조건을 다시 확인해 주십시오.",
      );
      return;
    }

    sendMutation.mutate(values);
  }

  function handleCopyTemplateToCompose() {
    composeForm.setValue("subject", selectedTemplate?.ma_subject ?? "", {
      shouldDirty: true,
    });
    composeForm.setValue("content", selectedTemplate?.ma_content ?? "", {
      shouldDirty: true,
    });
    toast.success("선택한 템플릿 본문을 발송 카드에 복사했습니다.");
  }

  function resetTemplate() {
    setSelectedTemplateId(null);
    templateForm.reset(emptyAdminMailTemplateFormValues);
  }

  return {
    appliedComposeValues,
    composeForm,
    createMutation,
    deleteDialogOpen,
    deleteMutation,
    dryRun,
    estimatedTargets,
    handleComposeSubmit,
    handleCopyTemplateToCompose,
    handleTemplateSubmit,
    isBusy,
    latestSendResult,
    recipientListQuery,
    recipientPage,
    recipientPagination,
    recipients,
    resetTemplate,
    selectedRecipientIds,
    selectedTemplate,
    selectedTemplateId,
    sendMutation,
    setAppliedComposeValues,
    setDeleteDialogOpen,
    setRecipientPage,
    setSelectedRecipientIds,
    setSelectedTemplateId,
    setTemplatePage,
    targetType,
    templateForm,
    templateListQuery,
    templatePage,
    templatePagination,
    templates,
    topError,
    updateMutation,
    useSelectedTemplate,
    visibleRecipientIds,
  };
}
