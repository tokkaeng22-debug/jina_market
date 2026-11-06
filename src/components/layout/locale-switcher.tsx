"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** 현재 페이지의 다른 언어 버전으로 이동 */
export function LocaleSwitcher({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const target = locale === "ko" ? "en" : "ko";

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      aria-label={`${ariaLabel}: ${label}`}
      className="inline-flex min-h-11 items-center rounded-full border border-white/60 px-4 text-sm font-bold hover:bg-white/15"
    >
      {label}
    </Link>
  );
}
