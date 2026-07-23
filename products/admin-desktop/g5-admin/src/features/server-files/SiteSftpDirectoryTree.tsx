import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  FolderOpen,
  FolderTree,
  LoaderCircle,
} from "lucide-react";
import { Tree, type NodeRendererProps } from "react-arborist";
import { cn } from "../../lib/utils";
import type { SiteSftpDirectoryTreeNode } from "./use-site-sftp-directory-tree";

type DirectoryTreeNode = {
  children: DirectoryTreeNode[];
  id: string;
  name: string;
  path: string;
  permissionsOctal: string | null;
};

function buildDirectoryTree(
  nodes: SiteSftpDirectoryTreeNode[],
  rootId: string,
  currentPath: string | null,
  selectedPath: string | null,
) {
  const byParent = new Map<string | number, SiteSftpDirectoryTreeNode[]>();
  const byId = new Map<string, SiteSftpDirectoryTreeNode>();

  for (const node of nodes) {
    byId.set(String(node.id), node);
    const siblings = byParent.get(node.parent) ?? [];
    siblings.push(node);
    byParent.set(node.parent, siblings);
  }

  const openState: Record<string, boolean> = {};

  const expandedReferencePath = selectedPath ?? currentPath;

  function buildNodeTree(node: SiteSftpDirectoryTreeNode): DirectoryTreeNode {
    const children = (byParent.get(node.id) ?? []).map(buildNodeTree);
    const id = String(node.id);
    const path = node.data?.path ?? id;
    openState[id] =
      node.droppable === true &&
      (expandedReferencePath === null ||
        expandedReferencePath === path ||
        expandedReferencePath.startsWith(`${path}/`));

    return {
      children,
      id,
      name: String(node.text),
      path,
      permissionsOctal: node.data?.permissionsOctal ?? null,
    };
  }

  return {
    initialOpenState: openState,
    treeData: (byParent.get(rootId) ?? []).map(buildNodeTree),
  };
}

export const SiteSftpDirectoryTree = memo(
  function SiteSftpDirectoryTree(props: {
    currentPath: string | null;
    fontScale: "sm" | "md" | "lg";
    loadingPath: string | null;
    nodes: SiteSftpDirectoryTreeNode[];
    onOpenDirectory: (path: string) => void;
    onToggleDirectory: (path: string) => void | Promise<void>;
    rootId: string;
    selectedPath: string | null;
  }) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [treeHeight, setTreeHeight] = useState(520);
    const { initialOpenState, treeData } = useMemo(
      () =>
        buildDirectoryTree(
          props.nodes,
          props.rootId,
          props.currentPath,
          props.selectedPath,
        ),
      [props.currentPath, props.nodes, props.rootId, props.selectedPath],
    );
    const rowHeight =
      props.fontScale === "lg" ? 46 : props.fontScale === "md" ? 42 : 38;

    useEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const updateHeight = () => {
        const nextHeight = Math.max(
          320,
          Math.floor(container.getBoundingClientRect().height),
        );
        setTreeHeight(nextHeight);
      };

      updateHeight();

      if (typeof ResizeObserver === "undefined") {
        return;
      }

      const observer = new ResizeObserver(() => {
        updateHeight();
      });
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    if (treeData.length === 0) {
      return (
        <div className="px-4 py-5 text-sm leading-6 text-slate-400">
          탐색할 디렉터리 트리를 아직 만들지 못했습니다.
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        data-font-scale={props.fontScale}
        data-sftp-pane="directory-tree"
        className="h-full min-h-0"
      >
        <Tree<DirectoryTreeNode>
          data={treeData}
          disableDrag
          disableMultiSelection
          height={treeHeight}
          idAccessor="id"
          indent={16}
          initialOpenState={initialOpenState}
          openByDefault={false}
          overscanCount={8}
          rowHeight={rowHeight}
          selection={props.selectedPath ?? undefined}
          selectionFollowsFocus
          width="100%"
          onActivate={(node) => props.onOpenDirectory(node.data.path)}
        >
          {(nodeProps) => (
            <DirectoryTreeRow
              currentPath={props.currentPath}
              fontScale={props.fontScale}
              loadingPath={props.loadingPath}
              onOpenDirectory={props.onOpenDirectory}
              onToggleDirectory={props.onToggleDirectory}
              selectedPath={props.selectedPath}
              {...nodeProps}
            />
          )}
        </Tree>
      </div>
    );
  },
);

function DirectoryTreeRow(
  props: NodeRendererProps<DirectoryTreeNode> & {
    currentPath: string | null;
    fontScale: "sm" | "md" | "lg";
    loadingPath: string | null;
    onOpenDirectory: (path: string) => void;
    onToggleDirectory: (path: string) => void | Promise<void>;
    selectedPath: string | null;
  },
) {
  const path = props.node.data.path;
  const active = props.selectedPath === path;
  const currentDirectory = props.currentPath === path;
  const loading = props.loadingPath === path;
  const hasChildren = props.node.isInternal;
  const rowClassName =
    props.fontScale === "lg"
      ? "text-[15px]"
      : props.fontScale === "md"
        ? "text-[14px]"
        : "text-[13px]";

  return (
    <div style={props.style} className="px-1">
      <button
        type="button"
        aria-current={currentDirectory ? "location" : undefined}
        data-current-directory={currentDirectory ? "true" : undefined}
        data-selected-directory={active ? "true" : undefined}
        className={cn(
          "flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors",
          rowClassName,
          active
            ? "bg-sky-400/16 text-slate-50 ring-1 ring-inset ring-sky-300/20"
            : currentDirectory
              ? "bg-slate-900/90 text-slate-100 ring-1 ring-inset ring-slate-700/80"
              : "text-slate-100 hover:bg-slate-800 hover:text-white",
        )}
        onClick={() => props.onOpenDirectory(path)}
      >
        {hasChildren ? (
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-sm transition-transform",
              props.node.isOpen && "rotate-90",
            )}
            onClick={(event) => {
              event.stopPropagation();
              if (!props.node.isOpen) {
                void props.onToggleDirectory(path);
              }
              props.node.toggle();
            }}
          >
            <ChevronRight className="size-4" />
          </span>
        ) : (
          <span className="size-4" />
        )}
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : hasChildren ? (
          <FolderOpen className="size-4" />
        ) : (
          <FolderTree className="size-4" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium tracking-tight">
          {props.node.data.name}
        </span>
      </button>
    </div>
  );
}
