import { sendConfirmationMail } from "@/lib/email";
import { initAdmin } from "@/lib/firebase/admin";
import { SYSTEM_ACTOR, writeHistoryUnlessUnchanged } from "@/lib/history";
import { revalidatePublicListing } from "@/lib/cache";
import { publicSnapshot } from "@/lib/public-fields";
import { asBusiness, toBusinessDoc } from "@/lib/data";
import { getListingStatsMap } from "@/lib/listing-analytics";
import { createManageLink } from "@/lib/listing-link";
import { confirmationSchedule, shouldSendReminder } from "@/lib/confirmation-schedule";
import { isDemoListing } from "@/lib/types";
import { randomUUID } from "crypto";

export async function runConfirmations(now = new Date()) {
  const { db } = initAdmin();
  const live = await db.collection("businesses").where("status", "==", "live").get();
  const unpublished: string[] = [];
  const reminded: string[] = [];

  for (const doc of live.docs) {
    const business = asBusiness(doc.id, doc.data() || {});
    if (isDemoListing(business) || !business.confirmationDueAt) continue;
    const { remindFrom, unpublishAt } = confirmationSchedule(business.confirmationDueAt);
    const unpublishDate = new Date(unpublishAt);

    if (now >= unpublishDate) {
      const next = {
        ...business,
        status: "unpublished" as const,
        updatedAt: now.toISOString(),
      };
      await doc.ref.set(toBusinessDoc(next), { merge: true });
      await writeHistoryUnlessUnchanged(
        "businesses",
        business.id,
        "update",
        publicSnapshot(business),
        publicSnapshot(next),
        SYSTEM_ACTOR,
      );
      const taskId = randomUUID();
      await db.collection("adminTasks").doc(taskId).set({
        id: taskId,
        type: "reconfirmation_overdue",
        status: "done",
        businessId: business.id,
        ownerId: business.ownerId,
        payload: { brandName: business.brandName, slug: business.slug },
        uenStoragePath: null,
        createdAt: now.toISOString(),
        resolvedAt: now.toISOString(),
        resolvedBy: "system",
        resolutionNote: "Unpublished after missed confirmation.",
      });
      unpublished.push(business.slug);
      revalidatePublicListing(business.slug);
      continue;
    }

    if (shouldSendReminder(business.lastReminderAt, now, new Date(remindFrom))) {
      const link = await createManageLink(business.id);
      let stats;
      try {
        stats = (await getListingStatsMap([business.id]))[business.id];
      } catch (error) {
        console.error("confirmation listing stats", error);
      }
      await sendConfirmationMail({
        to: business.contactEmail,
        brandName: business.brandName,
        confirmUrl: link.url,
        stats,
        isReminder: Boolean(business.lastReminderAt),
      });
      await doc.ref.set(
        { lastReminderAt: now.toISOString(), updatedAt: now.toISOString() },
        { merge: true },
      );
      reminded.push(business.slug);
    }
  }

  return { unpublished, reminded };
}
