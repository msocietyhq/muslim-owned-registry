export const LISTING_WIZARD_STEPS = 5;

export function wizardStepLabel(template: string, current: number, total: number) {
  return template.replace("{current}", String(current)).replace("{total}", String(total));
}
