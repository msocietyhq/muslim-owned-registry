"use client";

import { useEffect, useState } from "react";
import { shufflePick } from "@/lib/shuffle";
import { teamInitials, type TeamMember } from "@/lib/team";

export function TeamFaces({
  members,
  heading,
}: {
  members: TeamMember[];
  heading: string;
}) {
  const [order, setOrder] = useState(members);

  useEffect(() => {
    setOrder(shufflePick(members, members.length));
  }, [members]);

  if (!order.length) return null;

  return (
    <section className="mosg-letter-sign">
      <h2>{heading}</h2>
      <ul>
        {order.map((member) => {
          const label = member.name || heading;
          const inner = (
            <>
              {member.photoUrl ? (
                <img src={member.photoUrl} alt={label} />
              ) : (
                <span aria-hidden>{teamInitials(member)}</span>
              )}
              {member.name ? <em>{member.name}</em> : null}
            </>
          );
          return (
            <li key={member.id}>
              {member.url ? (
                <a href={member.url} rel="noreferrer" target="_blank">
                  {inner}
                </a>
              ) : (
                <div>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
