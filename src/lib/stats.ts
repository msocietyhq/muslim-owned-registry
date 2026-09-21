import { FieldValue } from "@/lib/db/documents";
import { canReadFirestore } from "@/lib/data";
import { initAdmin } from "@/lib/firebase/admin";

export const STATS_DOC = "stats/site";

export async function getSearchCount() {
  try {
    if (!(await canReadFirestore())) return 0;
    const { db } = initAdmin();
    const snap = await db.doc(STATS_DOC).get();
    const value = snap.data()?.searches;
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  } catch (error) {
    console.error("getSearchCount", error);
    return 0;
  }
}

export async function incrementSearchCount() {
  if (!(await canReadFirestore())) return 0;
  const { db } = initAdmin();
  const ref = db.doc(STATS_DOC);
  await ref.set(
    {
      searches: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return getSearchCount();
}
