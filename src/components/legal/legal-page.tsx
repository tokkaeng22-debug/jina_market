import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/** 약관 · 개인정보처리방침 · 환불정책 공통 틀. 본문은 정식 문서가 준비되면 채운다. */
export async function LegalPage({
  locale,
  titleKey,
  children,
}: {
  locale: Locale;
  titleKey: "terms" | "privacy" | "refund";
  children?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "Legal" });

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t(titleKey)}</h1>
      <p role="note" className="rounded-xl bg-mist p-4 text-sm text-muted">
        {t("draftNotice")}
      </p>
      <div className="flex flex-col gap-4 leading-relaxed">{children}</div>
    </article>
  );
}
