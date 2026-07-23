import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdminQaConfig,
  updateAdminQaConfig,
  type CommandError,
} from "../../api/client";
import {
  buildQaConfigUpdateInput,
  emptyQaConfigFormValues,
  qaConfigFormSchema,
  toQaConfigFormValues,
  type QaConfigFormValues,
} from "./admin-qa-config-form";
import type { AdminQaConfigResponse } from "../../types/AdminQaConfigResponse";
import type { AdminQaConfigUpdateInput } from "../../types/AdminQaConfigUpdateInput";

const qaConfigKey = ["admin", "qa-config"] as const;

export function useAdminQaConfigPage() {
  const queryClient = useQueryClient();
  const form = useForm<QaConfigFormValues>({
    defaultValues: emptyQaConfigFormValues(),
    resolver: zodResolver(qaConfigFormSchema),
  });

  const watchedValues = useWatch({ control: form.control });
  const formValues = {
    ...emptyQaConfigFormValues(),
    ...(watchedValues ?? {}),
  };

  const qaConfigQuery = useQuery<AdminQaConfigResponse, CommandError>({
    queryFn: getAdminQaConfig,
    queryKey: qaConfigKey,
    retry: false,
  });

  useEffect(() => {
    form.reset(toQaConfigFormValues(qaConfigQuery.data?.config));
  }, [form, qaConfigQuery.data]);

  const updateMutation = useMutation<
    AdminQaConfigResponse,
    CommandError,
    AdminQaConfigUpdateInput
  >({
    mutationFn: updateAdminQaConfig,
    onSuccess: (response) => {
      queryClient.setQueryData(qaConfigKey, response);
      form.reset(toQaConfigFormValues(response.config));
      toast.success("QA 설정을 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const baseline = qaConfigQuery.data?.config ?? null;

  return {
    baseline,
    error: qaConfigQuery.error ?? updateMutation.error ?? null,
    form,
    isBusy:
      qaConfigQuery.isLoading ||
      qaConfigQuery.isFetching ||
      updateMutation.isPending,
    updateMutation,
    updatePayload:
      baseline === null ? null : buildQaConfigUpdateInput(baseline, formValues),
    resetToBaseline() {
      form.reset(toQaConfigFormValues(baseline));
    },
  };
}
