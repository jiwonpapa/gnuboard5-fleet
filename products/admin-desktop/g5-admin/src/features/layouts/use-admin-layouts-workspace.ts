import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addAdminLayoutWidget,
  deleteAdminLayoutWidget,
  getAdminLayout,
  getAdminLayoutList,
  reorderAdminLayoutWidgets,
  saveAdminLayout,
  updateAdminLayoutWidget,
  type CommandError,
} from "../../api/client";
import {
  buildDraftFromLayout,
  type LayoutDraft,
  invalidateLayoutQueries,
  nextWidgetOrder,
  parseWidgetsJson,
  pickLayoutCommandError,
  syncLayoutDetail,
} from "./admin-layouts-page-helpers";

export function useAdminLayoutsWorkspace() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [requestedPageId, setRequestedPageId] = useState<string | null>(null);
  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, LayoutDraft>>({});
  const [newPageId, setNewPageId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newWidgetsJson, setNewWidgetsJson] = useState("[]");
  const [addWidgetJson, setAddWidgetJson] = useState(
    JSON.stringify(
      {
        type: "html_block",
        title: "새 위젯",
        order: 1,
        config: {},
        style: {},
      },
      null,
      2,
    ),
  );
  const [widgetId, setWidgetId] = useState("");
  const [widgetType, setWidgetType] = useState("");
  const [widgetTitle, setWidgetTitle] = useState("");
  const [widgetOrder, setWidgetOrder] = useState("");
  const [widgetConfigJson, setWidgetConfigJson] = useState("{}");
  const [widgetStyleJson, setWidgetStyleJson] = useState("{}");
  const [deleteWidgetId, setDeleteWidgetId] = useState("");

  const listQuery = useQuery({
    queryKey: ["admin", "layouts", page],
    queryFn: () => getAdminLayoutList({ page, per_page: 20 }),
    retry: false,
  });

  const layouts = listQuery.data?.layouts ?? [];
  const selectedPageId =
    requestedPageId && layouts.some((layout) => layout.sl_page_id === requestedPageId)
      ? requestedPageId
      : layouts[0]?.sl_page_id ?? null;

  const detailQuery = useQuery({
    queryKey: ["admin", "layouts", "detail", selectedPageId],
    queryFn: () => getAdminLayout(selectedPageId ?? ""),
    enabled: selectedPageId !== null,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: saveAdminLayout,
    onSuccess: async (response) => {
      syncLayoutDetail(queryClient, response);
      await invalidateLayoutQueries(queryClient);
      setRequestedPageId(response.layout.sl_page_id);
      setLayoutDrafts((current) => {
        const next = { ...current };
        delete next[response.layout.sl_page_id];
        return next;
      });
      toast.success("레이아웃을 저장했습니다.");
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const addWidgetMutation = useMutation({
    mutationFn: addAdminLayoutWidget,
    onSuccess: async (response) => {
      syncLayoutDetail(queryClient, response);
      await invalidateLayoutQueries(queryClient);
      setAddWidgetJson(
        JSON.stringify(
          {
            type: "html_block",
            title: "새 위젯",
            order: nextWidgetOrder(response.layout.sl_schema ?? null),
            config: {},
            style: {},
          },
          null,
          2,
        ),
      );
      toast.success("위젯을 추가했습니다.");
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const updateWidgetMutation = useMutation({
    mutationFn: updateAdminLayoutWidget,
    onSuccess: async (response) => {
      syncLayoutDetail(queryClient, response);
      await invalidateLayoutQueries(queryClient);
      toast.success("위젯을 수정했습니다.");
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: deleteAdminLayoutWidget,
    onSuccess: async (response) => {
      syncLayoutDetail(queryClient, response);
      await invalidateLayoutQueries(queryClient);
      setDeleteWidgetId("");
      toast.success("위젯을 삭제했습니다.");
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderAdminLayoutWidgets,
    onSuccess: async (response) => {
      syncLayoutDetail(queryClient, response);
      await invalidateLayoutQueries(queryClient);
      toast.success("위젯 순서를 저장했습니다.");
    },
    onError: (error: CommandError) => toast.error(error.message),
  });

  const topError = pickLayoutCommandError(
    listQuery.error,
    detailQuery.error,
    saveMutation.error,
    addWidgetMutation.error,
    updateWidgetMutation.error,
    deleteWidgetMutation.error,
    reorderMutation.error,
  );
  const selectedLayout = detailQuery.data?.layout ?? null;
  const activeDraft = selectedLayout
    ? layoutDrafts[selectedLayout.sl_page_id] ?? buildDraftFromLayout(selectedLayout)
    : null;
  const widgets = useMemo(
    () => parseWidgetsJson(activeDraft?.widgetsJson ?? "[]"),
    [activeDraft?.widgetsJson],
  );
  const isBusy =
    listQuery.isFetching ||
    detailQuery.isFetching ||
    saveMutation.isPending ||
    addWidgetMutation.isPending ||
    updateWidgetMutation.isPending ||
    deleteWidgetMutation.isPending ||
    reorderMutation.isPending;

  function updateActiveDraft(patch: Partial<LayoutDraft>) {
    if (!selectedLayout || !activeDraft) {
      return;
    }

    setLayoutDrafts((current) => ({
      ...current,
      [selectedLayout.sl_page_id]: {
        ...activeDraft,
        ...patch,
      },
    }));
  }

  return {
    activeDraft,
    addWidgetJson,
    addWidgetMutation,
    deleteWidgetId,
    deleteWidgetMutation,
    detailQuery,
    isBusy,
    listQuery,
    newPageId,
    newTitle,
    newWidgetsJson,
    page,
    reorderMutation,
    saveMutation,
    selectedLayout,
    selectedPageId,
    setAddWidgetJson,
    setDeleteWidgetId,
    setNewPageId,
    setNewTitle,
    setNewWidgetsJson,
    setPage,
    setRequestedPageId,
    setWidgetConfigJson,
    setWidgetId,
    setWidgetOrder,
    setWidgetStyleJson,
    setWidgetTitle,
    setWidgetType,
    topError,
    updateActiveDraft,
    updateWidgetMutation,
    widgetConfigJson,
    widgetId,
    widgetOrder,
    widgetStyleJson,
    widgetTitle,
    widgetType,
    widgets,
  };
}
