import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { legalDocsPublished } from "@/lib/seo/routes";
import { LegalPage } from "@/components/legal/legal-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return pageMetadata({ locale, path: "/privacy", title: t("privacy"), noindex: !legalDocsPublished });
}

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return <LegalPage locale={locale} titleKey="privacy" />;
}
