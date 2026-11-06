import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { demoProducts, getDemoProduct } from "@/lib/demo/products";
import { LearnView } from "@/components/learn/learn-view";
import { PageFallback } from "@/components/ui/page-fallback";

export function generateStaticParams() {
  return demoProducts.filter((p) => p.type === "course").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/learn/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Learn" });
  return pageMetadata({ locale: locale as Locale, path: `/learn/${slug}`, title: t("metaTitle"), noindex: true });
}

export default function LearnPage(props: PageProps<"/[locale]/learn/[slug]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <LearnPageContent params={props.params} />
    </Suspense>
  );
}

async function LearnPageContent({ params }: { params: PageProps<"/[locale]/learn/[slug]">["params"] }) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (getDemoProduct(slug)?.type !== "course") notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <LearnView slug={slug} />
    </div>
  );
}
