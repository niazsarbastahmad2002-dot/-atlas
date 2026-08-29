import { notFound } from "next/navigation";
import { isUiLocale, uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";
import { ATLAS_WHATSAPP_META_TEST_MODE } from "@/lib/reminders/whatsapp-runtime";
import { VerificationLanguageTest } from "./verification-language-test";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function PhoneVerificationTestPage({ searchParams }: PageProps) {
  if (
    process.env.VERCEL_ENV === "production"
    || process.env.ATLAS_WHATSAPP_MODE !== ATLAS_WHATSAPP_META_TEST_MODE
  ) {
    notFound();
  }

  const params = await searchParams;
  const locale: UiLocale = isUiLocale(params.lang) ? params.lang : "ku";
  const meta = uiLocaleMeta[locale];

  return (
    <main className="center-page" lang={meta.language} dir={meta.direction}>
      <section className="auth-card">
        <VerificationLanguageTest locale={locale} />
      </section>
    </main>
  );
}
