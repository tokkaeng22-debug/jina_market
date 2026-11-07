import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { getProducts } from "@/lib/catalog/server";
import { Banjjak } from "@/components/brand/banjjak";
import { ProductCard } from "@/components/shop/product-card";
import { LeadForm } from "@/components/shop/lead-form";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  return pageMetadata({ locale, path: "/" });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t, products] = await Promise.all([getTranslations({ locale, namespace: "Home" }), getProducts()]);

  return (
    <div className="bg-sky-600">
      <div className="rounded-t-[28px] bg-background">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
          <section className="flex items-center gap-4 rounded-3xl bg-mist p-6 sm:p-10">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <h1 className="text-2xl font-extrabold leading-snug tracking-tight text-balance sm:text-4xl">
                {t("heroTitle")}
                <br />
                <span className="text-sky-700">{t("heroAccent")}</span>
              </h1>
              <a
                href="#lead-magnet"
                className="inline-flex min-h-12 w-fit items-center rounded-xl bg-sky-700 px-5 text-base font-bold text-on-accent hover:brightness-110"
              >
                {t("heroCta")}
              </a>
            </div>
            <Banjjak pose="wave" size={128} title={t("mascotAlt")} />
          </section>

          <section id="classes" aria-labelledby="classes-title" className="flex scroll-mt-4 flex-col gap-4">
            <div>
              <h2 id="classes-title" className="text-2xl font-extrabold">
                {t("productsTitle")}
              </h2>
              <p className="mt-1 text-muted">{t("productsLead")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} />
              ))}
            </div>
          </section>

          <section id="lead-magnet" aria-labelledby="lead-title" className="flex scroll-mt-4 flex-col gap-3 rounded-3xl border-2 border-sky-500/40 p-6 sm:p-8">
            <h2 id="lead-title" className="text-2xl font-extrabold">
              {t("leadTitle")}
            </h2>
            <p className="text-muted">{t("leadBody")}</p>
            <LeadForm />
          </section>
        </div>
      </div>
    </div>
  );
}
