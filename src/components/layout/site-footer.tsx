import { getTranslations } from "next-intl/server";
import { businessCheckUrl, siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * 전 페이지 공통 푸터.
 * - 전자상거래법 제10조 사업자 표시 항목
 * - 개인정보처리방침은 다른 링크와 구분되게 굵게 · 색으로 (개인정보보호법 제30조, 처리방침 작성지침)
 * - 영어판에는 Lemon Squeezy MoR 고지
 */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  const b = siteConfig.business;
  const morNotice = t("morNotice");

  return (
    <footer className="border-t border-line bg-mist text-sm text-muted">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
        <nav aria-label="legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:underline">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="font-bold text-sky-700 hover:underline">
            {t("privacy")}
          </Link>
          <Link href="/refund" className="hover:underline">
            {t("refund")}
          </Link>
        </nav>

        <address className="flex flex-col gap-1 not-italic leading-relaxed">
          <span>
            {t("businessName")} {siteConfig.legalName} · {t("representative")} {b.representative}
          </span>
          <span>
            {t("businessNumber")} {b.registrationNumber}{" "}
            <a
              href={businessCheckUrl(b.registrationNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {t("businessCheck")}
            </a>
          </span>
          <span>
            {t("mailOrderNumber")} {b.mailOrderNumber}
          </span>
          <span>
            {t("address")} {b.address}
          </span>
          <span>
            {t("contact")} {b.email} · {b.phone} ({t("hours")})
          </span>
          <span>
            {t("hosting")} {b.hostingProvider}
          </span>
        </address>

        {morNotice ? <p>{morNotice}</p> : null}

        <p>© {siteConfig.copyrightYear} {siteConfig.name}</p>
      </div>
    </footer>
  );
}
