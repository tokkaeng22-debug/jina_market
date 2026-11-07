"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatAmount, type Badge, type Product } from "@/lib/catalog/types";
import { useDemo, useHydrated } from "@/lib/demo/store";
import { useAccount } from "@/lib/account/use-account";
import { useOwned } from "@/lib/account/use-owned";
import { LoginSheet } from "@/components/auth/login-sheet";
import { signOut, useAuth } from "@/lib/auth/use-auth";
import { btnPrimary, btnSecondary, card, chip } from "@/components/ui/styles";

/**
 * 마이페이지: 권한(entitlements)이 있는 상품만 보여 준다 (PLAN.md 5-1).
 * 상품 · 배지 이름은 서버가 넘긴 카탈로그에서, 주문 · 권한 · 배지 기록은 DB에서 읽는다.
 * 진도 · 과제는 아직 브라우저(localStorage)에만 저장한다.
 */
export function AccountView({ products, badges }: { products: Product[]; badges: Badge[] }) {
  const t = useTranslations("Account");
  const ts = useTranslations("Shop");
  const tl = useTranslations("Learn");
  const locale = useLocale() as Locale;
  const state = useDemo();
  const { status, user } = useAuth();
  const hydrated = useHydrated();
  const account = useAccount();
  const { owned } = useOwned();
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!hydrated || status === "loading" || !account.ready) return null;

  if (!user) {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="font-bold">{t("needLogin")}</p>
        <button type="button" onClick={() => setSheet(true)} className={btnPrimary}>
          {t("login")}
        </button>
        <LoginSheet open={sheet} onClose={() => setSheet(false)} />
      </div>
    );
  }

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const ownedProducts = owned.flatMap((slug) => bySlug.get(slug) ?? []);
  const badgeName = new Map(badges.map((b) => [b.code, b.name[locale]]));
  const myBadges = account.data.badges.filter((code) => badgeName.has(code));
  // 결제창을 닫아 실패로 끝난 주문은 목록에서 뺀다
  const orders = account.data.orders
    .filter((o) => o.status !== "failed")
    .map((o) => ({ ...o, label: o.id.slice(0, 8).toUpperCase() }));
  const dateFmt = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{t("hello", { name: user.name })}</h1>
        <button type="button" onClick={() => signOut()} className={btnSecondary}>
          {t("logout")}
        </button>
      </div>

      <section aria-labelledby="badges" className="flex flex-col gap-2">
        <h2 id="badges" className="text-lg font-extrabold">
          {t("badges")}
        </h2>
        {myBadges.length ? (
          <div className="flex flex-wrap gap-2">
            {myBadges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-cheer/30 px-3 py-1 font-bold">
                ★ {badgeName.get(b)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted">{t("noBadges")}</p>
        )}
      </section>

      <section aria-labelledby="library" className="flex flex-col gap-3">
        <h2 id="library" className="text-lg font-extrabold">
          {t("library")}
        </h2>
        {ownedProducts.length === 0 && (
          <div className={`${card} flex flex-col items-start gap-3`}>
            <p>{t("empty")}</p>
            <Link href="/#classes" className={btnSecondary}>
              {t("browse")}
            </Link>
          </div>
        )}
        {ownedProducts.map((p) => {
          const total = p.lessons.length;
          const done = state.progress[p.slug] ?? 0;
          const percent = total ? Math.round((done / total) * 100) : 0;
          return (
            <article key={p.slug} className={`${card} flex flex-col gap-3`}>
              <span className={chip}>{ts(`type.${p.type}`)}</span>
              <h3 className="text-lg font-extrabold">{p.title[locale]}</h3>
              {p.type === "course" && (
                <>
                  <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted">{t("progress", { done, total, percent })}</span>
                    <Link href={`/learn/${p.slug}`} className={btnPrimary}>
                      {ts("continue")}
                    </Link>
                  </div>
                </>
              )}
              {p.type === "ebook" && (
                <>
                  <button type="button" onClick={() => setNote(p.slug)} className={`${btnPrimary} w-fit`}>
                    {t("download")}
                  </button>
                  {note === p.slug && <p className="text-sm text-muted">{t("downloadNote")}</p>}
                </>
              )}
              {p.type === "live" && (
                <>
                  <p className="font-bold">{p.meta[locale]}</p>
                  <p className="text-sm text-muted">{t("liveNote")}</p>
                </>
              )}
            </article>
          );
        })}
      </section>

      {state.submissions.length > 0 && (
        <section aria-labelledby="subs" className="flex flex-col gap-2">
          <h2 id="subs" className="text-lg font-extrabold">
            {t("submissions")}
          </h2>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {state.submissions.map((s) => (
              <li key={s.createdAt} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate">
                  {bySlug.get(s.slug)?.title[locale]} · {tl("lessonOf", { n: s.lesson })}
                </span>
                <span className={chip}>{t("reviewing")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orders.length > 0 && (
        <section aria-labelledby="orders" className="flex flex-col gap-2">
          <h2 id="orders" className="text-lg font-extrabold">
            {t("orders")}
          </h2>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="min-w-0">
                  <span className="block font-bold">{bySlug.get(o.slug)?.title[locale]}</span>
                  <span className="text-sm text-muted">
                    {dateFmt.format(o.createdAt)} · {o.label} · {formatAmount(o.amount, o.currency, locale)}
                  </span>
                </span>
                <span className={chip}>{t(`status.${o.status}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
