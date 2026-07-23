import { z } from "zod";
import type { AdminMailTestInput } from "../../types/AdminMailTestInput";

const emailSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "올바른 이메일 형식이 아닙니다.",
  );

export const adminMailTestFormSchema = z.object({
  content: z.string().trim().min(1, "본문을 입력해 주세요."),
  subject: z.string().trim().min(1, "메일 제목을 입력해 주세요."),
  to: emailSchema,
});

export type AdminMailTestFormValues = z.infer<typeof adminMailTestFormSchema>;

export const emptyAdminMailTestFormValues: AdminMailTestFormValues = {
  content: "",
  subject: "",
  to: "",
};

export function buildAdminMailTestInput(
  values: AdminMailTestFormValues,
): AdminMailTestInput | null {
  const to = values.to.trim();
  const subject = values.subject.trim();
  const content = values.content.trim();

  if (to.length === 0 || subject.length === 0 || content.length === 0) {
    return null;
  }

  return {
    content,
    subject,
    to,
  };
}
