import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { AdminMemberMediaResult } from "../../types/AdminMemberMediaResult";
import type {
  FieldLabelResolver,
  MemberMediaUploadPayload,
} from "./member-detail-shared";

export function MemberMediaSection(props: {
  fieldLabel: FieldLabelResolver;
  iconDeleteResult: AdminMemberMediaResult | null;
  iconFile: File | null;
  iconUploadResult: AdminMemberMediaResult | null;
  imageDeleteResult: AdminMemberMediaResult | null;
  imageFile: File | null;
  imageUploadResult: AdminMemberMediaResult | null;
  onDeleteIcon: () => void;
  onDeleteImage: () => void;
  onIconFileChange: (file: File | null) => void;
  onImageFileChange: (file: File | null) => void;
  onUploadIcon: (payload: MemberMediaUploadPayload) => void;
  onUploadImage: (payload: MemberMediaUploadPayload) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>아이콘/프로필 이미지</CardTitle>
        <CardDescription>
          <code>/admin/members/{"{mb_id}"}/icon</code>,{" "}
          <code>/admin/members/{"{mb_id}"}/image</code> 업로드/삭제를 이 카드에서 처리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <MediaActionCard
          deleteLabel="아이콘 삭제"
          file={props.iconFile}
          label={props.fieldLabel("mb_icon", "아이콘")}
          onDelete={props.onDeleteIcon}
          onFileChange={props.onIconFileChange}
          onUpload={async () => {
            if (!props.iconFile) {
              return;
            }
            props.onUploadIcon(await toUploadPayload(props.iconFile));
            props.onIconFileChange(null);
          }}
          result={props.iconUploadResult ?? props.iconDeleteResult}
          uploadLabel="아이콘 업로드"
        />
        <MediaActionCard
          deleteLabel="이미지 삭제"
          file={props.imageFile}
          label={props.fieldLabel("mb_img", "프로필 이미지")}
          onDelete={props.onDeleteImage}
          onFileChange={props.onImageFileChange}
          onUpload={async () => {
            if (!props.imageFile) {
              return;
            }
            props.onUploadImage(await toUploadPayload(props.imageFile));
            props.onImageFileChange(null);
          }}
          result={props.imageUploadResult ?? props.imageDeleteResult}
          uploadLabel="이미지 업로드"
        />
      </CardContent>
    </Card>
  );
}

async function toUploadPayload(file: File): Promise<MemberMediaUploadPayload> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
  return {
    bytes,
    file_name: file.name,
    mime_type: file.type || null,
  };
}

function MediaActionCard(props: {
  deleteLabel: string;
  file: File | null;
  label: string;
  onDelete: () => void;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  result: AdminMemberMediaResult | null;
  uploadLabel: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{props.label}</p>
        <p className="text-xs text-muted-foreground">
          최근 결과:{" "}
          {props.result?.relative_path ??
            props.result?.url ??
            (props.result?.deleted ? "deleted" : "-")}
        </p>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-foreground">{props.label} 파일</span>
        <input
          type="file"
          onChange={(event) => props.onFileChange(event.currentTarget.files?.[0] ?? null)}
        />
      </label>
      <div className="grid gap-2 text-xs text-muted-foreground">
        <span>선택 파일: {props.file?.name ?? "-"}</span>
        <span>
          사이즈/치수: {props.result?.size ?? 0} / {props.result?.width ?? 0}x
          {props.result?.height ?? 0}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={props.onUpload} disabled={!props.file}>
          {props.uploadLabel}
        </Button>
        <Button type="button" variant="outline" onClick={props.onDelete}>
          {props.deleteLabel}
        </Button>
      </div>
    </div>
  );
}
