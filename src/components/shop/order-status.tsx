"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatAmount, ownedHref, type Product } from "@/lib/catalog/types";
import { demo, useDemo, useHydrated } from "@/lib/demo/store";
import { Banjjak } from "@/components/brand/banjjak";
import { btnPrimary, btnSecondary, card, chip } from "@/components/ui/styles";

/**
 * 결제 확인 중 · 입금 대기 화면.
 * 실제로는 결제사 복귀 시 서버가 결제 API로 검증하고, 웹훅이 와도 같은 grantEntitlements를 부른다.
 * 데모에서는 카드 결제를 1.5초 뒤 자동 확인한다.
 */
export function PendingStatus({ product }: { product: Product }) {
  const slug = product.slug;
  const t = useTranslations("Pending");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { orders, owned } = useDemo();
  const hydrated = useHydrated();
  const order = orders.find((o) => o.slug === slug && o.status !== "paid");
  // 확인이 끝나 완료 화면으로 넘어가는 중 (권한은 이미 있음)
  const redirecting = hydrated && !order && owned.includes(slug);

  useEffect(() => {
    if (redirecting) router.replace(`/checkout/${slug}/complete`);
  }, [redirecting, router, slug]);

  useEffect(() => {
    if (order?.status !== "pending") return;
    const id = order.id;
    const timer = setTimeout(() => demo.confirmOrder(id), 1500);
    return () => clearTimeout(timer);
  }, [order?.id, order?.status]);

  if (!hydrated) return null;

  if (!order && !redirecting) {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="font-bold">{t("noOrder")}</p>
        <Link href={`/products/${slug}`} className={btnSecondary}>
          {t("backProduct")}
        </Link>
      </div>
    );
  }

  if (!order || order.status === "pending") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <span className="size-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold">{t("checking")}</h1>
        <p className="text-muted">{t("checkingBody")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">{t("waiting")}</h1>
      <p className="text-muted">{t("waitingBody")}</p>
      <dl className={`${card} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2`}>
        <dt className="text-muted">{t("bank")}</dt>
        <dd className="font-bold">{t("bankValue")}</dd>
        <dt className="text-muted">{t("amount")}</dt>
        <dd className="font-bold">{formatAmount(order.amount, order.currency, locale)}</dd>
        <dt className="text-muted">{t("due")}</dt>
        <dd className="font-bold">{t("dueValue")}</dd>
      </dl>
      <button
        type="button"
        className={btnSecondary}
        onClick={() => demo.confirmOrder(order.id)}
      >
        {t("simulateDeposit")}
      </button>
    </div>
  );
}

export function CompleteStatus({ product }: { product: Product }) {
  const slug = product.slug;
  const t = useTranslations("Complete");
  const th = useTranslations("Home");
  const locale = useLocale() as Locale;
  const { orders, badges } = useDemo();
  const hydrated = useHydrated();
  const order = orders.find((o) => o.slug === slug && o.status === "paid");
  const paidCount = orders.filter((o) => o.status === "paid").length;

  if (!hydrated) return null;

  const primaryLabel = product.type === "course" ? t("startCourse") : product.type === "ebook" ? t("getEbook") : t("liveInfo");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Banjjak pose="wave" size={120} title={th("mascotAlt")} />
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="font-bold">{product.title[locale]}</p>
      {order && (
        <p className="text-muted">
          {t("orderNo")} {order.id} · {formatAmount(order.amount, order.currency, locale)}
          <br />
          {t("receipt")}
        </p>
      )}
      {badges.includes("first-purchase") && paidCount === 1 && (
        <div className={`${card} flex w-full items-center gap-3 text-left`}>
          <span className={chip}>{t("badge")}</span>
          <span className="font-bold">{t("badgeBody")}</span>
        </div>
      )}
      <Link href={ownedHref(slug, product.type)} className={`${btnPrimary} w-full`}>
        {primaryLabel}
      </Link>
      <Link href="/account" className={`${btnSecondary} w-full`}>
        {t("toAccount")}
      </Link>
    </div>
  );
}
