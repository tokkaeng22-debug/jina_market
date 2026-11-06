import type { Organization, Person, Thing, WebSite, WithContext } from "schema-dts";
import { siteConfig } from "@/config/site";
import { siteUrl } from "@/lib/env";
import type { Locale } from "@/i18n/routing";
import { localizedUrl } from "./metadata";

/** JSON-LD를 <script>로 출력. "<"를 이스케이프해 XSS를 막는다 (Next 공식 가이드 방식). */
export function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const orgId = `${siteUrl}/#organization`;
const personId = `${siteUrl}/#person`;
const websiteId = `${siteUrl}/#website`;

export function organizationJsonLd(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteUrl,
    email: siteConfig.business.email,
    founder: { "@id": personId },
    ...(siteConfig.sameAs.length ? { sameAs: [...siteConfig.sameAs] } : {}),
  };
}

export function personJsonLd(locale: Locale): WithContext<Person> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: siteConfig.author.name,
    jobTitle: siteConfig.author.jobTitle[locale],
    description: siteConfig.author.description[locale],
    url: localizedUrl(locale, "/"),
    worksFor: { "@id": orgId },
    ...(siteConfig.sameAs.length ? { sameAs: [...siteConfig.sameAs] } : {}),
  };
}

export function websiteJsonLd(locale: Locale): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    name: siteConfig.name,
    url: localizedUrl(locale, "/"),
    inLanguage: locale === "ko" ? "ko-KR" : "en-US",
    publisher: { "@id": orgId },
  };
}
