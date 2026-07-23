import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  createAdminFaq,
  createAdminFaqMaster,
  deleteAdminFaq,
  deleteAdminFaqMaster,
  deleteAdminFaqMasterFooterImage,
  deleteAdminFaqMasterHeaderImage,
  getAdminFaq,
  getAdminFaqList,
  getAdminFaqMaster,
  getAdminFaqMasterList,
  updateAdminFaq,
  updateAdminFaqMaster,
  uploadAdminFaqMasterFooterImage,
  uploadAdminFaqMasterHeaderImage,
  type CommandError,
} from "../../api/client";
import { hasFieldSchemaState } from "../schema/field-schema-state";
import {
  getFieldDescription,
  getFieldLabel,
  useAdminFieldSchema,
} from "../schema/useAdminFieldSchema";
import {
  adminFaqFormSchema,
  adminFaqMasterFormSchema,
  buildAdminFaqCreateInput,
  buildAdminFaqImageUploadInput,
  buildAdminFaqListQuery,
  buildAdminFaqMasterCreateInput,
  buildAdminFaqMasterListQuery,
  buildAdminFaqMasterUpdateInput,
  buildAdminFaqUpdateInput,
  emptyAdminFaqFormValues,
  emptyAdminFaqMasterFormValues,
  type AdminFaqFormValues,
  type AdminFaqMasterFormValues,
} from "./admin-faqs-form";
import { invalidateFaqQueries } from "./admin-faqs-page-helpers";

export function useAdminFaqsWorkspace() {
  const queryClient = useQueryClient();
  const faqMasterSchemaQuery = useAdminFieldSchema("faq-masters");
  const faqSchemaQuery = useAdminFieldSchema("faqs");
  const [masterPage, setMasterPage] = useState(1);
  const [faqPage, setFaqPage] = useState(1);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [selectedFaqId, setSelectedFaqId] = useState<number | null>(null);
  const [deleteMasterDialogOpen, setDeleteMasterDialogOpen] = useState(false);
  const [deleteFaqDialogOpen, setDeleteFaqDialogOpen] = useState(false);

  const masterForm = useForm<AdminFaqMasterFormValues>({
    defaultValues: emptyAdminFaqMasterFormValues,
    resolver: zodResolver(adminFaqMasterFormSchema),
  });
  const faqForm = useForm<AdminFaqFormValues>({
    defaultValues: emptyAdminFaqFormValues,
    resolver: zodResolver(adminFaqFormSchema),
  });

  const masterListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminFaqMasterList>>,
    CommandError
  >({
    queryKey: ["admin", "faq-masters", masterPage],
    queryFn: () => getAdminFaqMasterList(buildAdminFaqMasterListQuery(masterPage, 20)),
    retry: false,
  });
  const masterDetailQuery = useQuery<
    Awaited<ReturnType<typeof getAdminFaqMaster>>,
    CommandError
  >({
    queryKey: ["admin", "faq-masters", "detail", selectedMasterId],
    queryFn: () => getAdminFaqMaster(selectedMasterId ?? 0),
    retry: false,
    enabled: selectedMasterId !== null,
  });
  const faqListQuery = useQuery<
    Awaited<ReturnType<typeof getAdminFaqList>>,
    CommandError
  >({
    queryKey: ["admin", "faqs", selectedMasterId, faqPage],
    queryFn: () => getAdminFaqList(buildAdminFaqListQuery(selectedMasterId, faqPage, 20)),
    retry: false,
    enabled: selectedMasterId !== null,
  });
  const faqDetailQuery = useQuery<
    Awaited<ReturnType<typeof getAdminFaq>>,
    CommandError
  >({
    queryKey: ["admin", "faqs", "detail", selectedFaqId],
    queryFn: () => getAdminFaq(selectedFaqId ?? 0),
    retry: false,
    enabled: selectedFaqId !== null,
  });

  useEffect(() => {
    const master = masterDetailQuery.data?.master;
    if (!master) {
      return;
    }

    masterForm.reset({
      fm_id: master.fm_id,
      fm_subject: master.fm_subject,
      fm_order: String(master.fm_order),
      fm_head_html: master.fm_head_html,
      fm_tail_html: master.fm_tail_html,
      fm_mobile_head_html: master.fm_mobile_head_html,
      fm_mobile_tail_html: master.fm_mobile_tail_html,
    });
    if (selectedFaqId === null) {
      faqForm.setValue("fm_id", String(master.fm_id));
    }
  }, [faqDetailQuery.data?.faq, masterDetailQuery.data?.master, masterForm, faqForm, selectedFaqId]);

  useEffect(() => {
    const faq = faqDetailQuery.data?.faq;
    if (!faq) {
      return;
    }

    faqForm.reset({
      fa_id: faq.fa_id,
      fm_id: String(faq.fm_id),
      fa_subject: faq.fa_subject,
      fa_order: String(faq.fa_order),
      fa_content: faq.fa_content,
    });
  }, [faqDetailQuery.data?.faq, faqForm]);

  const createMasterMutation = useMutation({
    mutationFn: async (values: AdminFaqMasterFormValues) =>
      createAdminFaqMaster(buildAdminFaqMasterCreateInput(values)),
    onSuccess: async (response) => {
      toast.success(`FAQ 마스터 ${response.master.fm_subject}를 생성했습니다.`);
      setSelectedMasterId(response.master.fm_id);
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const updateMasterMutation = useMutation({
    mutationFn: async (values: AdminFaqMasterFormValues) =>
      updateAdminFaqMaster(buildAdminFaqMasterUpdateInput(values)),
    onSuccess: async () => {
      toast.success("FAQ 마스터를 수정했습니다.");
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const deleteMasterMutation = useMutation({
    mutationFn: async () => deleteAdminFaqMaster({ fm_id: selectedMasterId ?? 0 }),
    onSuccess: async () => {
      toast.success("FAQ 마스터를 삭제했습니다.");
      setSelectedMasterId(null);
      setSelectedFaqId(null);
      setDeleteMasterDialogOpen(false);
      masterForm.reset(emptyAdminFaqMasterFormValues);
      faqForm.reset(emptyAdminFaqFormValues);
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const createFaqMutation = useMutation({
    mutationFn: async (values: AdminFaqFormValues) =>
      createAdminFaq(buildAdminFaqCreateInput(values)),
    onSuccess: async (response) => {
      toast.success(`FAQ ${response.faq.fa_subject}를 생성했습니다.`);
      setSelectedFaqId(response.faq.fa_id);
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const updateFaqMutation = useMutation({
    mutationFn: async (values: AdminFaqFormValues) =>
      updateAdminFaq(buildAdminFaqUpdateInput(values)),
    onSuccess: async () => {
      toast.success("FAQ 문항을 수정했습니다.");
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const deleteFaqMutation = useMutation({
    mutationFn: async () => deleteAdminFaq({ fa_id: selectedFaqId ?? 0 }),
    onSuccess: async () => {
      toast.success("FAQ 문항을 삭제했습니다.");
      setSelectedFaqId(null);
      setDeleteFaqDialogOpen(false);
      faqForm.reset({
        ...emptyAdminFaqFormValues,
        fm_id: selectedMasterId ? String(selectedMasterId) : "",
      });
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const uploadHeaderMutation = useMutation({
    mutationFn: async (file: File) => {
      const input = await buildAdminFaqImageUploadInput(selectedMasterId ?? 0, file);
      return uploadAdminFaqMasterHeaderImage(input);
    },
    onSuccess: async () => {
      toast.success("헤더 이미지를 업로드했습니다.");
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const deleteHeaderMutation = useMutation({
    mutationFn: async () => deleteAdminFaqMasterHeaderImage(selectedMasterId ?? 0),
    onSuccess: async () => {
      toast.success("헤더 이미지를 삭제했습니다.");
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const uploadFooterMutation = useMutation({
    mutationFn: async (file: File) => {
      const input = await buildAdminFaqImageUploadInput(selectedMasterId ?? 0, file);
      return uploadAdminFaqMasterFooterImage(input);
    },
    onSuccess: async () => {
      toast.success("푸터 이미지를 업로드했습니다.");
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });
  const deleteFooterMutation = useMutation({
    mutationFn: async () => deleteAdminFaqMasterFooterImage(selectedMasterId ?? 0),
    onSuccess: async () => {
      toast.success("푸터 이미지를 삭제했습니다.");
      await invalidateFaqQueries(queryClient);
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const topError =
    masterListQuery.error ??
    masterDetailQuery.error ??
    faqListQuery.error ??
    faqDetailQuery.error ??
    createMasterMutation.error ??
    updateMasterMutation.error ??
    deleteMasterMutation.error ??
    createFaqMutation.error ??
    updateFaqMutation.error ??
    deleteFaqMutation.error ??
    uploadHeaderMutation.error ??
    deleteHeaderMutation.error ??
    uploadFooterMutation.error ??
    deleteFooterMutation.error ??
    null;

  const masters = masterListQuery.data?.masters ?? [];
  const masterPagination = masterListQuery.data?.pagination ?? null;
  const faqs = faqListQuery.data?.faqs ?? [];
  const faqPagination = faqListQuery.data?.pagination ?? null;
  const selectedMaster = masterDetailQuery.data?.master ?? null;
  const masterFieldSchema = faqMasterSchemaQuery.data?.schema ?? null;
  const faqFieldSchema = faqSchemaQuery.data?.schema ?? null;
  const masterFieldLabel = (name: string, fallback: string) =>
    getFieldLabel(masterFieldSchema, name, fallback);
  const faqFieldLabel = (name: string, fallback: string) =>
    getFieldLabel(faqFieldSchema, name, fallback);
  const masterFieldDescription = (name: string) =>
    getFieldDescription(masterFieldSchema, name);
  const faqFieldDescription = (name: string) =>
    getFieldDescription(faqFieldSchema, name);
  const hasMasterSchemaState = hasFieldSchemaState({
    error: faqMasterSchemaQuery.error ?? null,
    loading: faqMasterSchemaQuery.isLoading || faqMasterSchemaQuery.isFetching,
    schema: masterFieldSchema,
  });
  const hasFaqSchemaState = hasFieldSchemaState({
    error: faqSchemaQuery.error ?? null,
    loading: faqSchemaQuery.isLoading || faqSchemaQuery.isFetching,
    schema: faqFieldSchema,
  });
  const isBusy =
    masterListQuery.isFetching ||
    masterDetailQuery.isFetching ||
    faqListQuery.isFetching ||
    faqDetailQuery.isFetching ||
    createMasterMutation.isPending ||
    updateMasterMutation.isPending ||
    deleteMasterMutation.isPending ||
    createFaqMutation.isPending ||
    updateFaqMutation.isPending ||
    deleteFaqMutation.isPending ||
    uploadHeaderMutation.isPending ||
    deleteHeaderMutation.isPending ||
    uploadFooterMutation.isPending ||
    deleteFooterMutation.isPending;

  function handleMasterSubmit() {
    const values = masterForm.getValues();
    if (selectedMasterId !== null) {
      void updateMasterMutation.mutateAsync(values);
      return;
    }
    void createMasterMutation.mutateAsync(values);
  }

  function handleFaqSubmit() {
    const values = faqForm.getValues();
    if (selectedFaqId !== null) {
      void updateFaqMutation.mutateAsync(values);
      return;
    }
    void createFaqMutation.mutateAsync(values);
  }

  return {
    deleteFaqDialogOpen,
    deleteFaqMutation,
    deleteMasterDialogOpen,
    deleteMasterMutation,
    deleteFooterMutation,
    deleteHeaderMutation,
    faqFieldDescription,
    faqFieldLabel,
    faqFieldSchema,
    faqForm,
    faqPage,
    faqPagination,
    faqSchemaQuery,
    faqs,
    handleFaqSubmit,
    handleMasterSubmit,
    hasFaqSchemaState,
    hasMasterSchemaState,
    isBusy,
    masterFieldDescription,
    masterFieldLabel,
    masterFieldSchema,
    masterForm,
    masterPage,
    masterPagination,
    masters,
    selectedFaqId,
    selectedMaster,
    selectedMasterId,
    setDeleteFaqDialogOpen,
    setDeleteMasterDialogOpen,
    setFaqPage,
    setMasterPage,
    setSelectedFaqId,
    setSelectedMasterId,
    topError,
    uploadFooterMutation,
    uploadHeaderMutation,
    faqSchemaError: faqSchemaQuery.error ?? null,
    faqSchemaLoading: faqSchemaQuery.isLoading || faqSchemaQuery.isFetching,
    masterSchemaError: faqMasterSchemaQuery.error ?? null,
    masterSchemaLoading:
      faqMasterSchemaQuery.isLoading || faqMasterSchemaQuery.isFetching,
    resetMaster: () => {
      setSelectedMasterId(null);
      setSelectedFaqId(null);
      masterForm.reset(emptyAdminFaqMasterFormValues);
      faqForm.reset(emptyAdminFaqFormValues);
    },
    resetFaq: () => {
      setSelectedFaqId(null);
      faqForm.reset({
        ...emptyAdminFaqFormValues,
        fm_id: selectedMasterId ? String(selectedMasterId) : "",
      });
    },
    selectMaster: (masterId: number) => {
      setSelectedMasterId(masterId);
      setSelectedFaqId(null);
      setFaqPage(1);
    },
  };
}
