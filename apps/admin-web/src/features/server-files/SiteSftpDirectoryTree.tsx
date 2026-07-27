import { buildPathAncestors } from "./siteSftpBrowserHelpers";

export function SiteSftpDirectoryTree(props: {
  currentPath: string;
  recentPaths: string[];
  onOpen: (path: string) => void;
}) {
  const ancestors = buildPathAncestors(props.currentPath);
  const ancestorPaths = new Set(ancestors.map((entry) => entry.path));
  const recent = props.recentPaths.filter((path) => !ancestorPaths.has(path)).slice(0, 8);

  return (
    <aside className="sftp-directory-tree" aria-label="SFTP 디렉터리 트리">
      <div className="sftp-pane-title">
        <strong>Directories</strong>
        <span>{ancestors.length - 1} levels</span>
      </div>
      <ul>
        {ancestors.map((entry, index) => (
          <li key={entry.path}>
            <button
              type="button"
              aria-current={entry.path === props.currentPath ? "page" : undefined}
              style={{ paddingInlineStart: `${12 + index * 14}px` }}
              onClick={() => props.onOpen(entry.path)}
            >
              <span aria-hidden="true">▸</span>
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
      {recent.length > 0 && (
        <>
          <div className="sftp-pane-title recent">
            <strong>Recent</strong>
          </div>
          <ul>
            {recent.map((path) => (
              <li key={path}>
                <button type="button" onClick={() => props.onOpen(path)}>
                  <span aria-hidden="true">↳</span>
                  <span className="truncate">{path}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
