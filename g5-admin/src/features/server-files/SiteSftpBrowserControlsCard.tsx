import { ArrowUpFromLine, FolderPlus, RefreshCcw, Undo2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export function SiteSftpBrowserControlsCard(props: {
  connected: boolean;
  currentPath: string;
  dragActive: boolean;
  mkdirName: string;
  mkdirPending: boolean;
  onBrowse: () => void;
  onCreateDirectory: () => void;
  onMkdirNameChange: (value: string) => void;
  onPathChange: (value: string) => void;
  onUpload: () => void;
  refreshing: boolean;
  uploadPending: boolean;
}) {
  return (
    <div className="space-y-1.5 border-b border-slate-800/90 bg-slate-950 px-2 py-1.5 text-slate-100">
      <form
        className="flex flex-col gap-1.5"
        onPointerDownCapture={(event) => {
          event.stopPropagation();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          props.onBrowse();
        }}
      >
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <Input
              className="h-8 border-slate-800 bg-slate-900 px-2 text-[12px] text-slate-100 placeholder:text-slate-500"
              value={props.currentPath}
              onChange={(event) => props.onPathChange(event.currentTarget.value)}
              placeholder="예: ., /var/www/html"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-8 bg-slate-100 px-2.5 text-[11px] text-slate-950 hover:bg-white"
          >
            이동
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-100 hover:bg-slate-800 hover:text-white"
            disabled={props.refreshing}
            onClick={props.onBrowse}
          >
            {props.refreshing ? (
              <Undo2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1">
          <div className="min-w-0">
            <Input
              className="h-8 border-slate-800 bg-slate-900 px-2 text-[12px] text-slate-100 placeholder:text-slate-500"
              value={props.mkdirName}
              onChange={(event) => props.onMkdirNameChange(event.currentTarget.value)}
              placeholder="새 폴더 이름"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-100 hover:bg-slate-800 hover:text-white"
            disabled={!props.connected || props.uploadPending}
            onClick={props.onUpload}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            업로드
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-100 hover:bg-slate-800 hover:text-white"
            disabled={
              !props.connected ||
              props.mkdirPending ||
              props.mkdirName.trim().length === 0
            }
            onClick={() => {
              void props.onCreateDirectory();
            }}
          >
            <FolderPlus className="h-4 w-4" />
            폴더 생성
          </Button>
        </div>

        <div className="px-1 text-[10px] leading-4 text-slate-500">
          {props.dragActive
            ? "여기에 로컬 파일을 놓으면 현재 원격 디렉터리로 업로드합니다."
            : "파일 선택 또는 드래그 앤 드롭으로 여러 파일을 한 번에 업로드할 수 있습니다."}
        </div>
      </form>
    </div>
  );
}
