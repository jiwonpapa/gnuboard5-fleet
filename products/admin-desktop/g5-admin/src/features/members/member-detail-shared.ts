import type { UseFormReturn } from "react-hook-form";
import type { AdminMemberFormValues } from "./admin-members-form";

export type FieldLabelResolver = (name: string, fallback: string) => string;
export type FieldDescriptionResolver = (name: string) => string | undefined | null;
export type MemberForm = UseFormReturn<AdminMemberFormValues>;
export type MemberMediaUploadPayload = {
  bytes: number[];
  file_name: string;
  mime_type: string | null;
};
