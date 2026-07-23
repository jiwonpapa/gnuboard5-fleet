import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { listSftpDirectory, type CommandError } from "../../api/client";
import type { SftpDirectoryListResponse } from "../../types/SftpDirectoryListResponse";
import { inferFileName } from "./site-sftp-browser-helpers";

const ROOT_ID = "__sftp_tree_root__";

export type SiteSftpDirectoryTreeData = {
  path: string;
  permissionsOctal: string | null;
};

export type SiteSftpDirectoryTreeNode = {
  data?: SiteSftpDirectoryTreeData;
  droppable?: boolean;
  id: string | number;
  parent: string | number;
  text: string;
};

export function useSiteSftpDirectoryTree(args: {
  currentDirectory: SftpDirectoryListResponse | null;
  siteId: string | null;
}) {
  const [cachedDirectories, setCachedDirectories] = useState<
    Record<string, SftpDirectoryListResponse>
  >({});
  const loadDirectoryMutation = useMutation<
    SftpDirectoryListResponse,
    CommandError,
    { path: string; site_id: string }
  >({
    mutationFn: listSftpDirectory,
    onSuccess(response) {
      setCachedDirectories((current) => ({
        ...current,
        [response.resolved_path]: response,
      }));
    },
  });

  const directorySnapshots = useMemo(() => {
    if (!args.currentDirectory) {
      return cachedDirectories;
    }

    return {
      ...cachedDirectories,
      [args.currentDirectory.resolved_path]: args.currentDirectory,
    };
  }, [args.currentDirectory, cachedDirectories]);

  const rootPath = useMemo(() => {
    if (!args.currentDirectory) {
      return null;
    }

    for (const path of Object.keys(cachedDirectories)) {
      if (
        args.currentDirectory.resolved_path === path ||
        args.currentDirectory.resolved_path.startsWith(`${path}/`)
      ) {
        return path;
      }
    }

    return args.currentDirectory.resolved_path;
  }, [args.currentDirectory, cachedDirectories]);

  async function loadDirectory(path: string) {
    if (!args.siteId) {
      return null;
    }

    if (directorySnapshots[path]) {
      return directorySnapshots[path];
    }

    return loadDirectoryMutation.mutateAsync({
      path,
      site_id: args.siteId,
    });
  }

  const nodes = useMemo<SiteSftpDirectoryTreeNode[]>(() => {
    if (!rootPath) {
      return [];
    }

    const rootResponse = directorySnapshots[rootPath] ?? args.currentDirectory;
    const treeNodes: SiteSftpDirectoryTreeNode[] = [
      {
        id: rootPath,
        parent: ROOT_ID,
        text: inferFileName(rootPath),
        droppable: true,
        data: {
          path: rootPath,
          permissionsOctal:
            rootResponse?.entries.find((entry) => entry.path === rootPath)
              ?.metadata.permissions_octal ?? null,
        },
      },
    ];
    const seen = new Set<string>([rootPath]);

    for (const [parentPath, directory] of Object.entries(directorySnapshots)) {
      if (parentPath !== rootPath && !parentPath.startsWith(`${rootPath}/`)) {
        continue;
      }

      for (const entry of directory.entries) {
        if (entry.metadata.kind !== "directory" || seen.has(entry.path)) {
          continue;
        }

        treeNodes.push({
          id: entry.path,
          parent:
            parentPath === rootPath || seen.has(parentPath)
              ? parentPath
              : rootPath,
          text: entry.name,
          droppable: true,
          data: {
            path: entry.path,
            permissionsOctal: entry.metadata.permissions_octal ?? null,
          },
        });
        seen.add(entry.path);
      }
    }

    if (
      args.currentDirectory &&
      args.currentDirectory.resolved_path !== rootPath &&
      !seen.has(args.currentDirectory.resolved_path)
    ) {
      treeNodes.push({
        id: args.currentDirectory.resolved_path,
        parent: rootPath,
        text: inferFileName(args.currentDirectory.resolved_path),
        droppable: true,
        data: {
          path: args.currentDirectory.resolved_path,
          permissionsOctal: null,
        },
      });
    }

    return treeNodes;
  }, [args.currentDirectory, directorySnapshots, rootPath]);

  return {
    currentRootPath: rootPath,
    loadingPath: loadDirectoryMutation.variables?.path ?? null,
    loadDirectory,
    loadDirectoryError: loadDirectoryMutation.error,
    nodes,
    rootId: ROOT_ID,
  };
}
