"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import PortOne from "@portone/browser-sdk/v2";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice, ownedHref, type Product } from "@/lib/catalog/types";
import { useOwned } from "@/lib/account/use-owned";
import { useAuth } from "@/lib/auth/use-auth";
import { getPortOneEnv } from "@/lib/env";
import { confirmPayment, startCheckout, type PayMethod } from "@/lib/payments/actions";
import { LoginSheet } from "@/components/auth/login-sheet";
import { btnPrimary, btnSecondary, card, chip, fieldError, input } from "@/components/ui/styles";

/** 국내는 PortOne(카드 · 간편결제 · 가상계좌). 해외(Lemon Squeezy)는 아직 열지 않았다 */
const methods: PayMethod[] = ["card", "easyPay", "vbank"];
const portOneMethod = { card: "CARD", easyPay: "EASY_PAY", vbank: "VIRTUAL_ACCOUNT" } as const;

export function CheckoutForm({ product }: { product: Product }) {
  const t = useTranslations("Checkout");
  const ta = useTranslations("Auth");
  const ts = useTranslations("Shop");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { owned } = useOwned();
  const { status, user } = useAuth();
  const slug = product.slug;
  const portOne = getPortOneEnv();
  const canPay = locale === "ko" && portOne !== null;

  const [manualSheet, setSheet] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // 비로그인으로 들어오면 결제 화면 위에 로그인 창을 바로 띄운다
  const sheet = manualSheet || (status === "signedOut" && !dismissed);
  const [method, setMethod] = useState<PayMethod>(methods[0]);
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<"" | "phone" | "agree" | "start" | "closed">("");
  const [pgMessage, setPgMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");

  const price = formatPrice(product, locale);

  if (owned.includes(slug)) {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="font-bold">{t("alreadyOwned")}</p>
        <Link href={ownedHref(slug, product.type)} className={btnPrimary}>
          {t("goOwned")}
        </Link>
      </div>
    );
  }

  async function pay() {
    if (!user) return setSheet(true);
    const digits = phone.replace(/\D/g, "");
    if (!/^01\d{8,9}$/.test(digits)) return setError("phone");
    if (!agree) return setError("agree");
    if (!portOne) return;
    setError("");
    setBusy(true);
    try {
      const start = await startCheckout(slug, method);
      if (!start.ok) {
        if (start.reason === "login") return setSheet(true);
        if (start.reason === "owned") return router.refresh();
        return setError("start");
      }
      const pendingPath = `/checkout/${slug}/pending?paymentId=${encodeURIComponent(start.paymentId)}`;
      const response = await PortOne.requestPayment({
        storeId: portOne.storeId,
        channelKey: portOne.channelKey,
        paymentId: start.paymentId,
        orderName: start.orderName,
        totalAmount: start.amount,
        currency: "KRW",
        payMethod: portOneMethod[method],
        customer: { fullName: user.name || start.email.split("@")[0], phoneNumber: digits, email: start.email },
        // 모바일은 결제사 페이지로 이동했다가 이 주소로 돌아온다
        redirectUrl: `${window.location.origin}/${locale}${pendingPath}`,
        ...(method === "vbank" ? { virtualAccount: { accountExpiry: { validHours: 72 } } } : {}),
        ...(method === "easyPay" ? { easyPay: {} } : {}),
      });
      if (!response) return; // 리디렉션 중
      if (response.code) {
        await confirmPayment(start.paymentId, true);
        setPgMessage(response.message ?? "");
        return setError("closed");
      }
      router.push(pendingPath);
    } catch (err) {
      console.error(err);
      setError("start");
    } finally {
      setBusy(false);
    }
  }

  const errorText =
    error === "phone"
      ? t("phoneInvalid")
      : error === "agree"
        ? t("agreeRequired")
        : error === "start"
          ? t("payError")
          : error === "closed"
            ? t("payClosed", { message: pgMessage })
            : "";

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
              {user ? t("buyerLoggedIn", { name: user.name, via: ta(`via.${user.via}`) }) : t("buyerNeedLogin")}
            </p>
          </div>
          {status === "signedOut" && (
            <button type="button" onClick={() => setSheet(true)} className={btnSecondary}>
              {t("login")}
            </button>
          )}
        </div>

        {!canPay ? (
          <p className={`${card} font-bold`}>{locale === "ko" ? t("notReady") : t("intlSoon")}</p>
        ) : (
          <>
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
              <label htmlFor="phone" className="font-bold">
                {t("phone")}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error === "phone") setError("");
                }}
                className={input}
              />
              <p className="text-sm text-muted">{t("phoneHint")}</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => {
                  setAgree(e.target.checked);
                  if (error === "agree") setError("");
                }}
                className="mt-1 size-5 shrink-0 accent-sky-700"
              />
              <span>{t("agree")}</span>
            </label>

            <p role="alert" className={`min-h-5 ${fieldError}`}>
              {errorText}
            </p>

            <button type="button" onClick={pay} disabled={busy} className={`${btnPrimary} w-full disabled:opacity-60`}>
              {busy ? t("opening") : t("pay", { price })}
            </button>
          </>
        )}
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
