import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const tab = "rounded-full px-4 py-2 font-bold";

/** 관리자 화면 위쪽 탭 (주문 · 상품) */
export async function AdminNav({ current }: { current: "orders" | "products" }) {
  const t = await getTranslations("Admin");
  return (
    <nav aria-label={t("title")} className="flex flex-wrap items-center gap-2">
      <span className="mr-2 text-2xl font-extrabold">{t("title")}</span>
      <Link href="/admin" className={`${tab} ${current === "orders" ? "bg-sky-700 text-on-accent" : "hover:bg-mist"}`} aria-current={current === "orders" ? "page" : undefined}>
        {t("orders")}
      </Link>
      <Link
        href="/admin/products"
        className={`${tab} ${current === "products" ? "bg-sky-700 text-on-accent" : "hover:bg-mist"}`}
        aria-current={current === "products" ? "page" : undefined}
      >
        {t("products")}
      </Link>
    </nav>
  );
}

/** 관리자가 아닐 때 (로그아웃 상태 포함) */
export async function AdminDenied() {
  const t = await getTranslations("Admin");
  return (
    <div className="rounded-3xl bg-mist p-5">
      <p className="font-bold">{t("denied")}</p>
    </div>
  );
}
