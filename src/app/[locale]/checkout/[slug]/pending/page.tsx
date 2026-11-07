import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { getProduct, productSlugParams } from "@/lib/catalog/server";
import { PendingStatus } from "@/components/shop/order-status";
import { PageFallback } from "@/components/ui/page-fallback";

export function generateStaticParams() {
  return productSlugParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout/[slug]/pending">): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Pending" });
  return pageMetadata({ locale: locale as Locale, path: `/checkout/${slug}/pending`, title: t("metaTitle"), noindex: true });
}

export default function PendingPage(props: PageProps<"/[locale]/checkout/[slug]/pending">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <PendingPageContent params={props.params} />
    </Suspense>
  );
}

async function PendingPageContent({ params }: { params: PageProps<"/[locale]/checkout/[slug]/pending">["params"] }) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const product = await getProduct(slug);
  if (!product) notFound();
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <PendingStatus product={product} />
    </div>
  );
}
