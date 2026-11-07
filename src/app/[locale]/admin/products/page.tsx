import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { formatAmount } from "@/lib/catalog/types";
import { getAdminUser, listAllProducts } from "@/lib/admin/server";
import { AdminDenied, AdminNav } from "@/components/admin/admin-nav";
import { ProductEditor } from "@/components/admin/product-editor";
import { PageFallback } from "@/components/ui/page-fallback";
import { card, chip } from "@/components/ui/styles";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return pageMetadata({ locale: locale as Locale, path: "/admin/products", title: t("products"), noindex: true });
}

export default function AdminProductsPage(props: PageProps<"/[locale]/admin/products">) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Suspense fallback={<PageFallback />}>
        <ProductsContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ProductsContent({ params }: { params: PageProps<"/[locale]/admin/products">["params"] }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const ts = await getTranslations("Shop");

  if (!(await getAdminUser())) return <AdminDenied />;
  const products = await listAllProducts();

  return (
    <>
      <AdminNav current="products" />
      <p className="text-sm text-muted">{t("productsHint")}</p>
      {products.length === 0 ? (
        <p className={`${card} font-bold`}>{t("noProducts")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={chip}>{ts(`type.${p.type}`)}</span>
                    <span className="font-bold">{locale === "ko" ? p.titleKo : p.titleEn}</span>
                    <span className="text-sm text-muted">{t(`productStatus.${p.status}`)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-extrabold">{formatAmount(p.priceKrw, "KRW", locale)}</span>
                    <span aria-hidden="true" className="transition group-open:rotate-180">
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-line p-4">
                  <p className="text-sm text-muted">
                    /products/{p.slug}
                    {p.status === "published" && (
                      <>
                        {" · "}
                        <Link href={`/products/${p.slug}`} className="font-bold text-sky-700 hover:underline">
                          {t("viewPage")}
                        </Link>
                      </>
                    )}
                  </p>
                  <ProductEditor product={p} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
