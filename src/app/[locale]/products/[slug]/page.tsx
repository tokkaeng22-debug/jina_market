import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { getProduct, productSlugParams } from "@/lib/catalog/server";
import { formatPrice } from "@/lib/catalog/types";
import { BuyButton } from "@/components/shop/buy-button";
import { chip } from "@/components/ui/styles";
import { PageFallback } from "@/components/ui/page-fallback";

export function generateStaticParams() {
  return productSlugParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const l = locale as Locale;
  return pageMetadata({ locale: l, path: `/products/${slug}`, title: product.title[l], description: product.summary[l] });
}

export default function ProductPage(props: PageProps<"/[locale]/products/[slug]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <ProductPageContent params={props.params} />
    </Suspense>
  );
}

async function ProductPageContent({ params }: { params: PageProps<"/[locale]/products/[slug]">["params"] }) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  if (!product) notFound();
  const [t, ts] = await Promise.all([
    getTranslations({ locale, namespace: "Product" }),
    getTranslations({ locale, namespace: "Shop" }),
  ]);
  const price = formatPrice(product, locale);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link href="/" className="w-fit text-sm font-bold text-sky-700 hover:underline">
        ← {t("backHome")}
      </Link>

      <section className="flex flex-col gap-3 rounded-3xl bg-mist p-6 sm:p-8">
        {product.type === "course" && (
          <div className="grid aspect-video place-items-center rounded-2xl bg-sky-600 text-white">
            <span className="text-lg font-bold">▶ {t("preview")}</span>
          </div>
        )}
        <span className={chip}>{ts(`type.${product.type}`)}</span>
        <h1 className="text-2xl font-extrabold leading-snug sm:text-3xl">{product.title[locale]}</h1>
        <p className="text-lg">{product.summary[locale]}</p>
        <p className="text-muted">{product.meta[locale]}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-2xl font-extrabold">{price}</p>
          <BuyButton slug={product.slug} type={product.type} price={price} />
        </div>
      </section>

      {product.lessons.length > 0 && (
        <section aria-labelledby="curriculum" className="flex flex-col gap-3">
          <h2 id="curriculum" className="text-xl font-extrabold">
            {t("curriculum")}
          </h2>
          <ol className="divide-y divide-line rounded-2xl border border-line">
            {product.lessons.map((lesson, i) => (
              <li key={lesson.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="mr-2 font-bold text-sky-700">{i + 1}</span>
                  {lesson.title[locale]}
                  {lesson.preview && <span className={`${chip} ml-2`}>{t("preview")}</span>}
                </span>
                <span className="shrink-0 text-sm text-muted">{t("minutes", { n: lesson.minutes })}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="faq" className="flex flex-col gap-3">
        <h2 id="faq" className="text-xl font-extrabold">
          {t("faqTitle")}
        </h2>
        {(["1", "2"] as const).map((n) => (
          <details key={n} className="rounded-2xl border border-line px-4 py-3">
            <summary className="cursor-pointer font-bold">{t(`faq${n}q`)}</summary>
            <p className="mt-2 text-muted">{t(`faq${n}a`)}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
