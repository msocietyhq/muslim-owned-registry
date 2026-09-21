"use client";

import type { Tag } from "@/lib/types";
import { ui } from "@/lib/ui";

function chipClass(selected: boolean, suggested: boolean) {
  const base =
    "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 px-4 py-2.5 text-left font-sans text-base font-medium";
  if (selected) return `${base} border-mihrab bg-mihrab text-paper`;
  if (suggested) return `${base} border-gold bg-gold/30 text-mihrab`;
  return `${base} border-rule bg-surface text-ink hover:border-jade`;
}

export function TagPicker(props: {
  tags: Tag[];
  selected: string[];
  suggested: string[];
  onToggle: (id: string) => void;
  labels: {
    legend: string;
    hint: string;
    suggested: string;
  };
}) {
  const parents = props.tags.filter((tag) => !tag.parentId);
  const suggestedTags = props.tags.filter((tag) => props.suggested.includes(tag.id));

  return (
    <fieldset className="grid gap-3">
      <legend className={ui.small}>{props.labels.legend}</legend>
      <p className={ui.small}>{props.labels.hint}</p>
      {suggestedTags.length ? (
        <div>
          <p className={`${ui.label} mb-2`}>{props.labels.suggested}</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <button
                key={`suggest-${tag.id}`}
                type="button"
                className={chipClass(props.selected.includes(tag.id), true)}
                onClick={() => props.onToggle(tag.id)}
                aria-pressed={props.selected.includes(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {parents.map((parent) => {
        const children = props.tags.filter((tag) => tag.parentId === parent.id);
        return (
          <div key={parent.id}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={chipClass(
                  props.selected.includes(parent.id),
                  props.suggested.includes(parent.id),
                )}
                onClick={() => props.onToggle(parent.id)}
                aria-pressed={props.selected.includes(parent.id)}
              >
                {parent.name}
              </button>
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className={chipClass(
                    props.selected.includes(child.id),
                    props.suggested.includes(child.id),
                  )}
                  onClick={() => props.onToggle(child.id)}
                  aria-pressed={props.selected.includes(child.id)}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
