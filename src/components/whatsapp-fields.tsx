"use client";

import { WHATSAPP_TEMPLATE_MAX } from "@/lib/whatsapp";
import { ui } from "@/lib/ui";

export function WhatsappFields(props: {
  number: string;
  template: string;
  onNumberChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  labels: {
    number: string;
    numberHint: string;
    numberPlaceholder: string;
    template: string;
    templateHint: string;
  };
}) {
  return (
    <fieldset className="grid gap-4">
      <div>
        <label className={ui.label} htmlFor="whatsapp">
          {props.labels.number}
        </label>
        <p className={`${ui.small} mb-1.5`}>{props.labels.numberHint}</p>
        <input
          className={ui.input}
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={props.labels.numberPlaceholder}
          value={props.number}
          onChange={(event) => props.onNumberChange(event.target.value)}
        />
      </div>
      <div>
        <label className={ui.label} htmlFor="whatsappTemplate">
          {props.labels.template}
        </label>
        <p className={`${ui.small} mb-1.5`}>{props.labels.templateHint}</p>
        <textarea
          className={ui.textarea}
          id="whatsappTemplate"
          name="whatsappTemplate"
          maxLength={WHATSAPP_TEMPLATE_MAX}
          value={props.template}
          onChange={(event) => props.onTemplateChange(event.target.value)}
        />
        <p className={`${ui.small} mt-1.5`}>
          {props.template.length} / {WHATSAPP_TEMPLATE_MAX}
        </p>
      </div>
    </fieldset>
  );
}
