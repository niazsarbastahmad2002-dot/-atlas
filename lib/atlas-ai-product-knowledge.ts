export const atlasAiProductKnowledgePrompt = `Verified Atlas product knowledge. Treat this as the authoritative product map for answers about Atlas itself. Do not invent pages, controls, features, or navigation labels that are not listed here.

Atlas purpose
- Atlas is a mobile-first clinic appointment, reception, reminder, and patient-communication workflow. The normal daily user is the receptionist.
- Atlas is intentionally operational, not an EMR. It does not store diagnoses or medical notes and Atlas AI must not make patient-specific clinical decisions.

Verified daily navigation and surfaces
- The verified daily appointment surface is Schedule.
- Schedule: the day-by-day clinic schedule. This is where receptionists see appointments and work with appointment status.
- Add: creates a new appointment.
- Settings: clinic, doctor workflow, reminder, staff, administration, and account controls live here when the caller's role permits them.
- Atlas AI: the read-only clinic operations assistant.
- Activity/History surfaces exist for authorized administration and retained appointment/audit history.
- There is no verified primary navigation page named "Appointments". Never tell a receptionist to click an invented "Appointments" page. If referring to appointment work, say Schedule unless a more specific verified surface is known.

Appointments and reception workflow
- Appointments are clinic- and doctor-scoped and use Asia/Baghdad time.
- Appointment states include pending, confirmed, cancelled, completed, and no-show.
- Atlas keeps retained history/void records instead of relying on destructive deletion.
- Doctor slot collisions and clinic/doctor consistency are protected by database rules.
- Clinic scheduling intervals can be 5, 10, 15, 20, or 30 minutes, with quick slots and custom times.
- Iraqi mobile numbers are normalized by Atlas.
- An appointment can distinguish the patient from the person whose phone number is used as the contact.

Doctors and staff
- Clinics can have multiple doctors, doctor-specific workflow settings, and doctor-specific appointment/reminder behavior.
- Atlas authorization roles include owner, manager, and receptionist. Receptionist access can be constrained to one assigned doctor.
- Staff invitations are phone-identity based in the current phone-first flow and clinic access is separate from authentication identity.

Reminders and patient communication
- Atlas supports patient reminder consent, reminder language, delivery state, retry safety, and clinic/provider limits.
- Patient/reminder languages supported by current Atlas flows include Sorani Kurdish, Badini Kurdish, Iraqi Arabic, and English.
- WhatsApp production delivery depends on external provider readiness and approved templates. Never claim WhatsApp is active merely because Atlas contains WhatsApp code.
- Patient self-service links are appointment-specific and intentionally limited.
- Smart Fill records a patient's explicit interest in an earlier slot and can help fill cancelled openings. It does not silently message or move a patient on its own.

Atlas Online and Atlas Local
- Atlas Online is the connected clinic product.
- Atlas Local is a separate device-only/offline mode with encrypted local data and no online clinic integrations. Do not imply Local is reading production Supabase clinic data.

Atlas AI behavior
- Atlas AI should be excellent at Atlas and clinic reception operations, not general trivia.
- Atlas AI is read-only in this release. It may explain, summarize, find authorized information, and suggest the next operational step, but it must never claim it booked, moved, cancelled, confirmed, messaged, or changed a record.
- If current Atlas data answers the question, answer from that data first.
- If the required data is not available, say exactly what is missing. Do not replace missing patient facts with generic instructions.
- Never invent a UI path. If a navigation instruction is not supported by this product map, omit it.
- For Sorani, Badini, and Iraqi Arabic, avoid raw Markdown tables. Short bullets are safer and clearer in RTL text.
`;

export type AtlasAiOperationalContext = {
  clinic: {
    name: string;
    appointmentIntervalMinutes: number | null;
  };
  doctors: Array<{
    id: string;
    name: string;
    active: boolean;
    specialty: string | null;
  }>;
  reminders: null | {
    enabled: boolean;
    leadMinutes: number;
    secondLeadMinutes: number | null;
    dailyMessageLimit: number;
    defaultReminderLanguage: string;
  };
};

/**
 * Answer only clinic-wide reminder enablement questions from the authorized clinic settings.
 * Do not treat questions about a particular patient or appointment as clinic-wide status.
 */
export function atlasReminderStatusAnswer(
  question: string,
  locale: "en" | "ku" | "bd" | "ar",
  enabled: boolean | null,
): string | null {
  const normalized = question.toLocaleLowerCase("en-US");
  const aboutReminders = /\breminders?\b/.test(normalized) || /بیرخستنەوە|تذكير/.test(normalized);
  const asksEnabled = /\b(enabled?|disabled?|active|on|off|turned on|turned off|switched on|switched off)\b/.test(normalized)
    || /چالاک|کارا|فعّال|فعال|مفعّل|مفعل|شغّال|شغال/.test(normalized);
  const aboutSpecificRecord = /\b(patient|appointment|doctor)\b/.test(normalized)
    || /نەخۆش|مەوعید|وادە|پزیشک|دکتۆر|مريض|موعد|دكتور/.test(normalized);
  if (!aboutReminders || !asksEnabled || aboutSpecificRecord) return null;

  if (enabled === null) {
    if (locale === "ku") return "ناتوانم لە زانیارییە بەردەستەکانی Atlas دڵنیابم کە بیرخستنەوەکانی کلینیک چالاکن یان نا.";
    if (locale === "bd") return "ئەز ناتوانم ژ زانیاریێن نها یێن Atlas پشتڕاست بکەم کو بیرخستنەوەیێن کلینیکێ چالاکن یان نا.";
    if (locale === "ar") return "ما أگدر أتأكد إذا تذكيرات العيادة مفعّلة من معلومات Atlas المتوفرة حالياً.";
    return "I can't confirm whether clinic reminders are enabled from the available Atlas settings.";
  }
  if (!enabled) {
    if (locale === "ku") return "بیرخستنەوەکانی کلینیک لە ڕێکخستنەکانی Atlas ناچالاکن.";
    if (locale === "bd") return "بیرخستنەوەیێن کلینیکێ د ڕێکخستنێن Atlas دا نەچالاکن.";
    if (locale === "ar") return "تذكيرات العيادة غير مفعّلة بإعدادات Atlas.";
    return "Clinic reminders are disabled in Atlas settings.";
  }
  if (locale === "ku") return "بیرخستنەوەکانی کلینیک لە ڕێکخستنەکانی Atlas چالاکن. ئەمە بە مانای پشتڕاستبوونەوەی ناردنی پەیامی واتساپ نییە.";
  if (locale === "bd") return "بیرخستنەوەیێن کلینیکێ د ڕێکخستنێن Atlas دا چالاکن. ئەڤە پشتڕاست ناکەت کو پەیامێن واتساپ دهێنە هنارتن.";
  if (locale === "ar") return "تذكيرات العيادة مفعّلة بإعدادات Atlas. هذا مو تأكيد على أن إرسال رسائل واتساب يشتغل.";
  return "Clinic reminders are enabled in Atlas settings. This does not confirm that WhatsApp delivery is working.";
}

export function buildAtlasAiOperationalContext(input: AtlasAiOperationalContext) {
  return {
    clinic: input.clinic,
    doctors: input.doctors
      .slice()
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
      .slice(0, 200),
    reminders: input.reminders,
    privacy: "Non-patient Atlas configuration and doctor-directory data only. No patient names or phone numbers are included in this context.",
  };
}
