import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { AccountView } from "@/components/account/account-view";
import { getBadges, getProducts } from "@/lib/catalog/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return pageMetadata({ locale: locale as Locale, path: "/account", title: t("metaTitle"), noindex: true });
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [products, badges] = await Promise.all([getProducts(), getBadges()]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <AccountView products={products} badges={badges} />
    </div>
  );
}
