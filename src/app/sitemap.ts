import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { languageAlternates, localizedUrl } from "@/lib/seo/metadata";
import { publicStaticPaths } from "@/lib/seo/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicStaticPaths.flatMap(({ path, changeFrequency, priority }) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, path),
      changeFrequency,
      priority,
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
