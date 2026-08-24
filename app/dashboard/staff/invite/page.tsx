import { redirect } from "next/navigation";
import { isUuid } from "@/lib/appointments";

type Props = { searchParams: Promise<{ clinic?: string }> };

export default async function ReceptionistInvitePage({ searchParams }: Props) {
  const { clinic } = await searchParams;
  if (clinic && isUuid(clinic)) redirect(`/dashboard/staff?clinic=${clinic}`);
  redirect("/dashboard/staff");
}
