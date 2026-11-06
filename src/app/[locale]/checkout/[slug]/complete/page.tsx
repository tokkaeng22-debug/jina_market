import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { demoProducts, getDemoProduct } from "@/lib/demo/products";
import { CompleteStatus } from "@/components/shop/order-status";
import { PageFallback } from "@/components/ui/page-fallback";

export function generateStaticParams() {
  return demoProducts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout/[slug]/complete">): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Complete" });
  return pageMetadata({ locale: locale as Locale, path: `/checkout/${slug}/complete`, title: t("metaTitle"), noindex: true });
}

export default function CompletePage(props: PageProps<"/[locale]/checkout/[slug]/complete">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <CompletePageContent params={props.params} />
    </Suspense>
  );
}

async function CompletePageContent({ params }: { params: PageProps<"/[locale]/checkout/[slug]/complete">["params"] }) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!getDemoProduct(slug)) notFound();
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <CompleteStatus slug={slug} />
    </div>
  );
}
