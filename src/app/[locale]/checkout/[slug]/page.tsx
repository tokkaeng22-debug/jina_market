import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { getProduct, productSlugParams } from "@/lib/catalog/server";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { PageFallback } from "@/components/ui/page-fallback";

export function generateStaticParams() {
  return productSlugParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Checkout" });
  return pageMetadata({ locale: locale as Locale, path: `/checkout/${slug}`, title: t("metaTitle"), noindex: true });
}

export default function CheckoutPage(props: PageProps<"/[locale]/checkout/[slug]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <CheckoutPageContent params={props.params} />
    </Suspense>
  );
}

async function CheckoutPageContent({ params }: { params: PageProps<"/[locale]/checkout/[slug]">["params"] }) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const product = await getProduct(slug);
  if (!product) notFound();
  const t = await getTranslations({ locale, namespace: "Checkout" });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <CheckoutForm product={product} />
    </div>
  );
}
