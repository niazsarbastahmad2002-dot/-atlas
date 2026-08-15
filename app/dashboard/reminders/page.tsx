import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/app/components/submit-button";
import { updateReminderSettings } from "./actions";

export const dynamic = "force-dynamic";

type ReminderSettingsPageProps = {
  searchParams: Promise<{
    clinic?: string;
    error?: string;
    notice?: string;
  }>;
};

const errors: Record<string, string> = {
  invalid: "Choose valid reminder settings and try again.",
  unavailable: "Reminder settings are unavailable for that clinic.",
  approval_required: "WhatsApp reminders cannot be enabled until the clinic messaging setup is approved server-side.",
  save_failed: "The reminder settings could not be saved. Check your clinic role and try again.",
};

export default async function ReminderSettingsPage({ searchParams }: ReminderSettingsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name, owner_id")
    .order("created_at", { ascending: true });
  if (clinicsError || !clinics?.length) redirect("/dashboard");

  const requestedClinic = params.clinic && isUuid(params.clinic) ? params.clinic : null;
  const clinic = clinics.find((item) => item.id === requestedClinic) ?? clinics[0];

  const [{ data: settings, error: settingsError }, { data: membership }] = await Promise.all([
    supabase
      .from("clinic_reminder_settings")
      .select("enabled, lead_minutes, default_reminder_language, messaging_approved_at, template_name, template_language, daily_message_limit")
      .eq("clinic_id", clinic.id)
      .maybeSingle(),
    supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinic.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

  if (settingsError || !settings) {
    return <SettingsUnavailable />;
  }

  const canManage = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";
  const approved = Boolean(settings.messaging_approved_at);
  const errorMessage = params.error ? errors[params.error] : null;

  return (
    <main className="dashboard shell">
      <header className="dashboard-header">
        <div>
          <div className="brand">Reminder settings</div>
          <p className="quiet">{clinic.name}</p>
        </div>
        <a className="button button-ghost button-small" href={`/dashboard?clinic=${clinic.id}`}>Back to schedule</a>
      </header>

      {clinics.length > 1 ? (
        <form className="clinic-switcher" method="get">
          <label htmlFor="clinic">Clinic workspace</label>
          <select id="clinic" name="clinic" defaultValue={clinic.id}>
            {clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="button button-ghost button-small" type="submit">Switch</button>
        </form>
      ) : null}

      {errorMessage ? <p className="notice notice-error" role="alert">{errorMessage}</p> : null}
      {params.notice === "saved" ? <p className="notice notice-success" role="status">Reminder settings saved.</p> : null}

      <section className="panel" style={{ maxWidth: 680 }}>
        <div className="panel-heading">
          <div>
            <div className="eyebrow">WhatsApp reminders</div>
            <h1>Clinic defaults</h1>
          </div>
          <span className="count-pill">{approved ? "Messaging approved" : "Approval pending"}</span>
        </div>

        <form action={updateReminderSettings} className="stack-form">
          <input type="hidden" name="clinic_id" value={clinic.id} />

          <label className="checkbox-field" htmlFor="enabled">
            <input
              id="enabled"
              name="enabled"
              type="checkbox"
              defaultChecked={settings.enabled}
              disabled={!canManage || !approved}
            />
            <span>Send appointment reminders automatically.</span>
          </label>
          {!approved ? (
            <p className="field-help">This stays locked until a verified WhatsApp number and approved template are activated server-side.</p>
          ) : null}

          <label htmlFor="lead_minutes">Send reminder before appointment</label>
          <select id="lead_minutes" name="lead_minutes" defaultValue={String(settings.lead_minutes)} disabled={!canManage}>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="240">4 hours</option>
            <option value="720">12 hours</option>
            <option value="1440">1 day</option>
            <option value="2880">2 days</option>
            <option value="10080">7 days</option>
          </select>

          <label htmlFor="default_reminder_language">Default patient reminder language</label>
          <select
            id="default_reminder_language"
            name="default_reminder_language"
            defaultValue={settings.default_reminder_language}
            disabled={!canManage}
          >
            <option value="ku">Kurdish (Sorani)</option>
            <option value="ar">Arabic</option>
            <option value="en">English</option>
          </select>

          <p className="field-help">Template: {settings.template_name} · {settings.template_language} · clinic daily limit {settings.daily_message_limit}.</p>
          <SubmitButton pendingLabel="Saving…" disabled={!canManage}>Save reminder settings</SubmitButton>
        </form>

        {!canManage ? <p className="notice notice-error">Only the clinic owner or a manager can change these settings.</p> : null}
      </section>
    </main>
  );
}

function SettingsUnavailable() {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand">Atlas</div>
        <h1>Reminder settings could not load.</h1>
        <a className="button" href="/dashboard">Back to schedule</a>
      </section>
    </main>
  );
}
