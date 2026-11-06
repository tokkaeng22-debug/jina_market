import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { JsonLd, organizationJsonLd, personJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import "../globals.css";

// 실서비스에서는 Pretendard 셀프호스팅으로 교체 예정 (DESIGN_BRIEF.md)
const notoSansKr = Noto_Sans_KR({
  weight: ["400", "500", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-kr",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("defaultTitle"), template: `%s | ${t("siteName")}` },
    description: t("defaultDescription"),
    applicationName: t("siteName"),
    openGraph: { siteName: t("siteName") },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={notoSansKr.variable}>
      <body className="flex min-h-dvh flex-col antialiased">
        <NextIntlClientProvider>
          <DemoBanner />
          <SiteHeader locale={locale} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} />
        </NextIntlClientProvider>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={personJsonLd(locale)} />
        <JsonLd data={websiteJsonLd(locale)} />
      </body>
    </html>
  );
}
