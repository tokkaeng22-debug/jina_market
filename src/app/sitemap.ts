import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { languageAlternates, localizedUrl } from "@/lib/seo/metadata";
import { publicStaticPaths } from "@/lib/seo/routes";
import { getProducts } from "@/lib/catalog/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productPaths = (await getProducts()).map((p) => ({
    path: `/products/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  return [...publicStaticPaths, ...productPaths].flatMap(({ path, changeFrequency, priority }) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, path),
      changeFrequency,
      priority,
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
