import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LocaleSwitcher } from "./locale-switcher";
import { HeaderAccount } from "./header-account";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Nav" });

  return (
    <header className="bg-sky-600 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          jina
        </Link>
        <nav aria-label="main" className="flex items-center gap-1 sm:gap-2">
          <Link href="/#classes" className="hidden rounded-full px-3 py-2 text-base font-bold hover:bg-white/15 sm:inline">
            {t("classes")}
          </Link>
          <span className="hidden rounded-full px-3 py-2 text-base font-bold opacity-90 sm:inline">
            {t("blog")}
          </span>
          <HeaderAccount />
          <LocaleSwitcher label={t("switchTo")} ariaLabel={t("language")} />
        </nav>
      </div>
    </header>
  );
}
