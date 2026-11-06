"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice, getDemoProduct, ownedHref } from "@/lib/demo/products";
import { demo, useDemo, useHydrated, type PayMethod } from "@/lib/demo/store";
import { LoginSheet } from "@/components/auth/login-sheet";
import { btnPrimary, btnSecondary, card, chip, fieldError, input } from "@/components/ui/styles";

/** 국내는 PortOne(카드 · 간편결제 · 가상계좌), 해외는 Lemon Squeezy(카드 · PayPal) */
const methodsByLocale: Record<Locale, PayMethod[]> = { ko: ["card", "easyPay", "vbank"], en: ["card", "paypal"] };

export function CheckoutForm({ slug }: { slug: string }) {
  const t = useTranslations("Checkout");
  const ta = useTranslations("Auth");
  const ts = useTranslations("Shop");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { user, owned } = useDemo();
  const hydrated = useHydrated();
  const product = getDemoProduct(slug)!;
  const methods = methodsByLocale[locale];

  const [manualSheet, setSheet] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // 비로그인으로 들어오면 결제 화면 위에 로그인 창을 바로 띄운다
  const sheet = manualSheet || (hydrated && !user && !dismissed);
  const [method, setMethod] = useState<PayMethod>(methods[0]);
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");

  const price = formatPrice(product, locale);

  if (hydrated && owned.includes(slug)) {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="font-bold">{t("alreadyOwned")}</p>
        <Link href={ownedHref(slug, product.type)} className={btnPrimary}>
          {t("goOwned")}
        </Link>
      </div>
    );
  }

  function pay() {
    if (!user) return setSheet(true);
    if (!agree) return setAgreeError(true);
    demo.placeOrder(slug, method, locale === "ko" ? "KRW" : "USD");
    router.push(`/checkout/${slug}/pending`);
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className={`${card} flex items-start justify-between gap-3`}>
          <div className="flex flex-col gap-1">
            <span className={chip}>{ts(`type.${product.type}`)}</span>
            <p className="font-bold">{product.title[locale]}</p>
          </div>
          <p className="shrink-0 text-lg font-extrabold">{price}</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
          <div>
            <p className="text-sm text-muted">{t("buyer")}</p>
            <p className="font-bold">
              {hydrated && user ? t("buyerLoggedIn", { name: user.name, via: ta(`via.${user.via}`) }) : t("buyerNeedLogin")}
            </p>
          </div>
          {!(hydrated && user) && (
            <button type="button" onClick={() => setSheet(true)} className={btnSecondary}>
              {t("login")}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="coupon" className="font-bold">
            {t("coupon")}
          </label>
          <div className="flex gap-2">
            <input
              id="coupon"
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value);
                setCouponMsg("");
              }}
              className={`${input} min-w-0 flex-1`}
            />
            <button type="button" className={btnSecondary} onClick={() => setCouponMsg(coupon.trim() ? t("couponPending") : t("couponEmpty"))}>
              {t("couponApply")}
            </button>
          </div>
          {couponMsg && <p className="text-sm text-muted">{couponMsg}</p>}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">{t("method")}</legend>
          {methods.map((m) => (
            <label
              key={m}
              className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 ${method === m ? "border-sky-500 bg-mist" : "border-line"}`}
            >
              <span className="font-bold">{t(`methods.${m}`)}</span>
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="size-5 accent-sky-700" />
            </label>
          ))}
          <p className="text-sm text-muted">{t("provider")}</p>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                setAgreeError(false);
              }}
              className="mt-1 size-5 shrink-0 accent-sky-700"
            />
            <span>{t("agree")}</span>
          </label>
          <p role="alert" className={`min-h-5 ${fieldError}`}>
            {agreeError ? t("agreeRequired") : ""}
          </p>
        </div>

        <button type="button" onClick={pay} className={`${btnPrimary} w-full`}>
          {t("pay", { price })}
        </button>
      </div>
      <LoginSheet
        open={sheet}
        onClose={() => {
          setSheet(false);
          setDismissed(true);
        }}
      />
    </>
  );
}
