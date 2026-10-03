export function scheduleFormIsBusy() {
  if (document.querySelector("form.appointment-edit-form")) return true;
  const form = document.querySelector<HTMLFormElement>("form.appointment-form");
  if (!form) return false;
  const name = form.querySelector<HTMLInputElement>('input[name="patient_name"]')?.value.trim();
  const phone = form.querySelector<HTMLInputElement>('input[name="patient_phone"]')?.value.trim();
  const relationship = form.querySelector<HTMLSelectElement>('select[name="contact_relationship"]')?.value;
  const consent = form.querySelector<HTMLInputElement>('input[name="reminder_consent"]')?.checked;
  const timeDraft = form.querySelector('[data-atlas-time-draft="true"]');
  const active = document.activeElement;
  return Boolean(
    name
    || phone
    || relationship
    || consent
    || timeDraft
    || (active instanceof HTMLElement && form.contains(active))
    || form.querySelector("[data-atlas-editor-open='true']")
  );
}
