import { ui } from "@/lib/ui";

type Step = { title: string; body: string };
type Group = { heading?: string; steps: readonly Step[] };

export function DirectoryTimeline({
  title,
  lead,
  steps,
  groups,
}: {
  title: string;
  lead?: string;
  steps?: readonly Step[];
  groups?: readonly Group[];
}) {
  const blocks: Group[] = groups?.length ? [...groups] : steps?.length ? [{ steps }] : [];
  return (
    <section className={`${ui.section} border-t border-rule/70`}>
      <h2 className={ui.sectionTitle}>{title}</h2>
      {lead ? <p className="mb-8 max-w-[62ch] leading-relaxed">{lead}</p> : null}
      <div className="grid gap-10">
        {blocks.map((group) => (
          <div key={group.heading || group.steps[0]?.title}>
            {group.heading ? (
              <p className={`${ui.kicker} mb-4`}>
                {group.heading}
              </p>
            ) : null}
            <ol className="mosg-timeline">
              {group.steps.map((step, index) => (
                <li key={step.title} className="mosg-timeline-item">
                  <span className="mosg-timeline-mark" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="mosg-timeline-body">
                    <h3 className="font-display text-xl text-mihrab sm:text-2xl">{step.title}</h3>
                    <p className="mt-2 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
