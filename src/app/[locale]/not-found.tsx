import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="text-muted">{t("body")}</p>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center rounded-xl bg-sky-700 px-5 font-bold text-on-accent hover:brightness-110"
      >
        {t("home")}
      </Link>
    </div>
  );
}
