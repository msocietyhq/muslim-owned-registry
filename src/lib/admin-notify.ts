import { adminEmails } from "@/lib/admin-env";
import { sendAdminTaskMail } from "@/lib/email";
import { issueLoginMagicLink } from "@/lib/login-challenge";
import type { AdminTaskType } from "@/lib/types";

export async function notifyAdminsOfOpenTask(params: {
  type: AdminTaskType;
  heading: string;
  detail: string;
}) {
  const mailboxes = adminEmails();
  for (const email of mailboxes) {
    try {
      const { magicUrl } = await issueLoginMagicLink({
        email,
        nextPath: "/admin",
        kind: "admin-task",
      });
      await sendAdminTaskMail({
        to: email,
        heading: params.heading,
        detail: params.detail,
        openUrl: magicUrl,
      });
    } catch (error) {
      console.error("admin task mail", email, error);
    }
  }
}
