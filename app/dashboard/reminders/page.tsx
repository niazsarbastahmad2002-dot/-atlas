import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";

export default async function ReminderSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ clinic?: string }>;
}) {
  const { clinic } = await searchParams;
  if (clinic && isUuid(clinic)) redirect(`/dashboard/settings?clinic=${clinic}`);
  redirect("/dashboard/settings");
}
