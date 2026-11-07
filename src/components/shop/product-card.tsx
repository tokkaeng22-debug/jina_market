import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice, type Product } from "@/lib/catalog/types";
import { btnSecondary, chip } from "@/components/ui/styles";

export async function ProductCard({ product, locale }: { product: Product; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Shop" });
  return (
    <article className="flex flex-col gap-2 rounded-3xl bg-mist p-5">
      <span className={chip}>{t(`type.${product.type}`)}</span>
      <h3 className="text-lg font-extrabold leading-snug">{product.title[locale]}</h3>
      <p className="text-muted">{product.meta[locale]}</p>
      <p className="mt-auto text-xl font-extrabold">{formatPrice(product, locale)}</p>
      <Link href={`/products/${product.slug}`} className={btnSecondary}>
        {t("detail")}
      </Link>
    </article>
  );
}
