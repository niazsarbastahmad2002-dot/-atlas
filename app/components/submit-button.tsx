"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
  lockForm?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel,
  className = "button",
  disabled = false,
  lockForm = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDisabled = pending || disabled;

  useEffect(() => {
    if (!lockForm || !pending) return;
    const form = buttonRef.current?.form;
    if (!form) return;

    const previousBusy = form.getAttribute("aria-busy");
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'));
    const inputStates = inputs.map((input) => ({
      input,
      readOnly: input.readOnly,
      disabled: input.disabled,
      canReadOnly: !["checkbox", "radio", "range", "color", "file", "submit", "reset", "button", "image"].includes(input.type),
    }));
    const textareas = Array.from(form.querySelectorAll<HTMLTextAreaElement>("textarea"))
      .map((textarea) => ({ textarea, readOnly: textarea.readOnly }));
    const selects = Array.from(form.querySelectorAll<HTMLSelectElement>("select"))
      .map((select) => ({ select, disabled: select.disabled }));
    const buttons = Array.from(form.querySelectorAll<HTMLButtonElement>("button"))
      .filter((button) => button !== buttonRef.current)
      .map((button) => ({ button, disabled: button.disabled }));

    form.setAttribute("aria-busy", "true");
    inputStates.forEach(({ input, canReadOnly }) => {
      if (canReadOnly) input.readOnly = true;
      else input.disabled = true;
    });
    textareas.forEach(({ textarea }) => { textarea.readOnly = true; });
    selects.forEach(({ select }) => { select.disabled = true; });
    buttons.forEach(({ button }) => { button.disabled = true; });

    return () => {
      if (previousBusy === null) form.removeAttribute("aria-busy");
      else form.setAttribute("aria-busy", previousBusy);
      inputStates.forEach(({ input, readOnly, disabled: wasDisabled }) => {
        if (!input.isConnected) return;
        input.readOnly = readOnly;
        input.disabled = wasDisabled;
      });
      textareas.forEach(({ textarea, readOnly }) => {
        if (textarea.isConnected) textarea.readOnly = readOnly;
      });
      selects.forEach(({ select, disabled: wasDisabled }) => {
        if (select.isConnected) select.disabled = wasDisabled;
      });
      buttons.forEach(({ button, disabled: wasDisabled }) => {
        if (button.isConnected) button.disabled = wasDisabled;
      });
    };
  }, [lockForm, pending]);

  return (
    <button ref={buttonRef} className={className} type="submit" disabled={isDisabled} aria-disabled={isDisabled}>
      {pending ? pendingLabel : children}
    </button>
  );
}
