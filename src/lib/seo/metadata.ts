import type { Metadata } from "next";
import { siteUrl } from "@/lib/env";
import { routing, type Locale } from "@/i18n/routing";

const ogLocale: Record<Locale, string> = { ko: "ko_KR", en: "en_US" };

/** 언어별 절대 URL. path는 언어 접두사 없이 "/"로 시작 ("/"는 홈) */
export function localizedUrl(locale: Locale, path = "/") {
  const suffix = path === "/" ? "" : path;
  return `${siteUrl}/${locale}${suffix}`;
}

/** hreflang 짝 (ko, en, x-default) */
export function languageAlternates(path = "/") {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localizedUrl(l, path);
  languages["x-default"] = localizedUrl(routing.defaultLocale, path);
  return languages;
}

type PageMetaInput = {
  locale: Locale;
  /** 언어 접두사를 뺀 경로, 예: "/terms" */
  path: string;
  title?: string;
  description?: string;
  /** 로그인 · 결제 · 작성 중 문서 등 색인하지 않을 페이지 */
  noindex?: boolean;
};

/** 모든 페이지가 쓰는 메타데이터: canonical, hreflang, OG, robots */
export function pageMetadata({ locale, path, title, description, noindex }: PageMetaInput): Metadata {
  const url = localizedUrl(locale, path);
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      url,
      locale: ogLocale[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => ogLocale[l]),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
  };
}
