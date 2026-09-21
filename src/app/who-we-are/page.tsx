import type { Metadata } from "next";
import { TeamFaces } from "@/components/team-faces";
import { getCopy } from "@/lib/lang";
import { listTeamMembers } from "@/lib/team-data";
import { ui } from "@/lib/ui";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getCopy();
  return {
    title: t.who.title,
    description: t.who.p1,
    alternates: { canonical: "/who-we-are" },
  };
}

export default async function WhoWeArePage() {
  const { t } = await getCopy();
  const members = await listTeamMembers();
  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>{t.who.title}</h1>
      <div className="mosg-letter mx-auto mt-8 max-w-[40rem]">
        <p>{t.who.p1}</p>
        <p>{t.who.p2}</p>
        <p>{t.who.p3}</p>
        <TeamFaces members={members} heading={t.who.faces} />
      </div>
    </div>
  );
}
