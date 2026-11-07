"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatAmount, ownedHref, type Product } from "@/lib/catalog/types";
import { refreshAccount, useAccount } from "@/lib/account/use-account";
import { confirmPayment, type ConfirmResult } from "@/lib/payments/actions";
import { useAuth } from "@/lib/auth/use-auth";
import { Banjjak } from "@/components/brand/banjjak";
import { btnPrimary, btnSecondary, card, chip } from "@/components/ui/styles";

/** 결제 확인을 몇 번까지 다시 물어볼지 (2초 간격, 약 10초) */
const MAX_TRIES = 5;

/**
 * 결제창에서 돌아온 뒤의 확인 화면 (PLAN.md 5-1).
 * 서버가 PortOne API로 결제를 다시 조회해 권한을 준다. 카드 · 간편결제는 보통 바로 끝나고,
 * 가상계좌는 계좌를 보여 주고 입금은 웹훅으로 확인한다.
 */
export function PendingStatus({ product }: { product: Product }) {
  const t = useTranslations("Pending");
  const tb = useTranslations("Banks");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const params = useSearchParams();
  const { status: authStatus } = useAuth();
  const paymentId = params.get("paymentId");
  // 모바일 리디렉션은 실패 · 취소를 code · message 쿼리로 알려 준다
  const failCode = params.get("code");
  const failMessage = params.get("message");

  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [tries, setTries] = useState(0);
  const [checking, setChecking] = useState(false);
  const started = useRef(false);

  async function check(closing = false) {
    if (!paymentId) return;
    setChecking(true);
    try {
      const r = await confirmPayment(paymentId, closing);
      setResult(r);
      setTries((n) => n + 1);
      if (r.status === "paid") {
        await refreshAccount();
        router.replace(`/checkout/${product.slug}/complete`);
      }
    } catch (err) {
      console.error(err);
      setTries((n) => n + 1);
    } finally {
      setChecking(false);
    }
  }

  // 로그인 상태가 확인된 뒤 한 번 시작한다
  useEffect(() => {
    if (started.current || authStatus !== "signedIn" || !paymentId) return;
    started.current = true;
    void check(Boolean(failCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, paymentId]);

  // 아직 결제 중이면 2초 뒤 다시 물어본다 (웹훅보다 결제창 복귀가 빠를 때)
  useEffect(() => {
    if (result?.status !== "pending" || tries >= MAX_TRIES || failCode) return;
    const timer = setTimeout(() => void check(), 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, tries]);

  if (!paymentId || authStatus === "signedOut" || result?.status === "notFound") {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="font-bold">{t("noOrder")}</p>
        <Link href={`/products/${product.slug}`} className={btnSecondary}>
          {t("backProduct")}
        </Link>
      </div>
    );
  }

  if (result?.status === "failed" || (failCode && result)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-extrabold">{t("failed")}</h1>
        <p className="text-muted">{failMessage || t("failedBody")}</p>
        <Link href={`/checkout/${product.slug}`} className={btnPrimary}>
          {t("retry")}
        </Link>
      </div>
    );
  }

  if (result?.status === "refunded") {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="font-bold">{t("refunded")}</p>
        <Link href="/account" className={btnSecondary}>
          {t("toAccount")}
        </Link>
      </div>
    );
  }

  if (result?.status === "awaiting_deposit") {
    const va = result.virtualAccount;
    const expires = va?.expiresAt
      ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(va.expiresAt))
      : null;
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">{t("waiting")}</h1>
        <p className="text-muted">{t("waitingBody")}</p>
        {va && (
          <dl className={`${card} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2`}>
            <dt className="text-muted">{t("bank")}</dt>
            <dd className="font-bold">{va.bank ? (tb.has(va.bank) ? tb(va.bank) : va.bank) : "-"}</dd>
            <dt className="text-muted">{t("account")}</dt>
            <dd className="font-bold break-all">{va.accountNumber}</dd>
            {va.holder && (
              <>
                <dt className="text-muted">{t("holder")}</dt>
                <dd className="font-bold">{va.holder}</dd>
              </>
            )}
            <dt className="text-muted">{t("amount")}</dt>
            <dd className="font-bold">{formatAmount(va.amount, "KRW", locale)}</dd>
            {expires && (
              <>
                <dt className="text-muted">{t("due")}</dt>
                <dd className="font-bold">{expires}</dd>
              </>
            )}
          </dl>
        )}
        <button type="button" className={btnSecondary} disabled={checking} onClick={() => void check()}>
          {t("checkDeposit")}
        </button>
        <Link href="/account" className="w-fit text-sm font-bold text-sky-700 hover:underline">
          {t("toAccount")}
        </Link>
      </div>
    );
  }

  if (result?.status === "pending" && tries >= MAX_TRIES) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-extrabold">{t("slow")}</h1>
        <p className="text-muted">{t("slowBody")}</p>
        <button type="button" className={btnSecondary} disabled={checking} onClick={() => void check()}>
          {t("checkAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
      <span className="size-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" aria-hidden="true" />
      <h1 className="text-2xl font-extrabold">{t("checking")}</h1>
      <p className="text-muted">{t("checkingBody")}</p>
    </div>
  );
}

export function CompleteStatus({ product }: { product: Product }) {
  const t = useTranslations("Complete");
  const th = useTranslations("Home");
  const locale = useLocale() as Locale;
  const { ready, data } = useAccount();
  const slug = product.slug;

  if (!ready) return null;

  const paid = data.orders.filter((o) => o.status === "paid");
  const order = paid.find((o) => o.slug === slug);
  const primaryLabel = product.type === "course" ? t("startCourse") : product.type === "ebook" ? t("getEbook") : t("liveInfo");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Banjjak pose="wave" size={120} title={th("mascotAlt")} />
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="font-bold">{product.title[locale]}</p>
      {order && (
        <p className="text-muted">
          {t("orderNo")} {order.id.slice(0, 8).toUpperCase()} · {formatAmount(order.amount, order.currency, locale)}
          <br />
          {t("receipt")}
        </p>
      )}
      {data.badges.includes("first-purchase") && paid.length === 1 && (
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
