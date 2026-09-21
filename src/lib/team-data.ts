import { randomUUID } from "crypto";
import { canReadFirestore } from "@/lib/data";
import { initAdmin } from "@/lib/firebase/admin";
import {
  TEAM_COLLECTION,
  asTeamMember,
  parseTeamMemberInput,
  type TeamMember,
} from "@/lib/team";

export async function listTeamMembers(): Promise<TeamMember[]> {
  try {
    if (!(await canReadFirestore())) return [];
    const { db } = initAdmin();
    const snap = await db.collection(TEAM_COLLECTION).get();
    return snap.docs
      .map((doc) => asTeamMember(doc.id, doc.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  } catch (error) {
    console.error("listTeamMembers", error);
    return [];
  }
}

export async function createTeamMember(input: {
  name?: string | null;
  photoUrl?: string | null;
  url?: string | null;
}) {
  const fields = parseTeamMemberInput(input);
  const { db } = initAdmin();
  const id = randomUUID();
  const record: TeamMember = {
    id,
    ...fields,
    createdAt: new Date().toISOString(),
  };
  await db.collection(TEAM_COLLECTION).doc(id).set(record);
  return record;
}

export async function deleteTeamMember(id: string) {
  const { db } = initAdmin();
  const ref = db.collection(TEAM_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}
