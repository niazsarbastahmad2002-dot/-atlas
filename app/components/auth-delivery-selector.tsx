"use client";

type Delivery = "sms" | "whatsapp";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.25a8.25 8.25 0 0 0-7.08 12.49L4 20l4.36-.89A8.25 8.25 0 1 0 12 3.25Z" />
      <path d="M9.08 8.03c.2-.46.4-.47.59-.48h.5c.15 0 .36.05.48.36l.76 1.82c.08.2.06.35-.05.53l-.48.7c-.13.17-.25.31-.08.59.18.28.77 1.24 1.7 1.98 1.18.94 2.14 1.25 2.46 1.39.27.12.44.1.61-.1l.8-.94c.18-.22.36-.17.6-.08l1.68.79c.27.13.46.2.52.31.07.1.07.63-.15 1.22-.22.6-1.27 1.13-1.76 1.17-.45.04-1.02.07-1.65-.13-.38-.12-.88-.28-1.51-.56-.27-.12-4.65-1.73-6.36-5.9-.48-1.17-.51-2.01-.31-2.67.14-.45.39-.78.61-1.02.2-.23.42-.51.59-.9Z" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8.2L6 20v-2.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
      <path d="M7.5 9.5h9M7.5 13h6" />
    </svg>
  );
}

export function AuthDeliverySelector({
  legend,
  value,
  onChange,
  smsLabel,
  whatsappLabel,
  showSms = true,
  showWhatsApp = true,
  name = "auth-delivery",
}: {
  legend: string;
  value: Delivery;
  onChange: (delivery: Delivery) => void;
  smsLabel: string;
  whatsappLabel: string;
  showSms?: boolean;
  showWhatsApp?: boolean;
  name?: string;
}) {
  const choices = [
    ...(showWhatsApp ? [{ value: "whatsapp" as const, label: whatsappLabel, icon: <WhatsAppIcon /> }] : []),
    ...(showSms ? [{ value: "sms" as const, label: smsLabel, icon: <SmsIcon /> }] : []),
  ];

  if (choices.length === 0) return null;

  return (
    <fieldset className="auth-delivery-selector">
      <legend>{legend}</legend>
      <div className={`auth-delivery-grid${choices.length === 1 ? " is-single" : ""}`}>
        {choices.map((choice) => {
          const selected = value === choice.value;
          return (
            <label className={`auth-delivery-choice${selected ? " is-selected" : ""}`} key={choice.value}>
              <input
                className="auth-delivery-radio"
                type="radio"
                name={name}
                value={choice.value}
                checked={selected}
                onChange={() => onChange(choice.value)}
              />
              <span className={`auth-delivery-icon auth-delivery-icon-${choice.value}`} aria-hidden="true">{choice.icon}</span>
              <span className="auth-delivery-label">{choice.label}</span>
              <span className="auth-delivery-check" aria-hidden="true">✓</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
