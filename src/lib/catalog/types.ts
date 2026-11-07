import type { Locale } from "@/i18n/routing";

/**
 * 화면에서 쓰는 상품 모양. DB(products · lessons)를 읽어 서버에서 만들고,
 * 클라이언트 컴포넌트에는 props로 넘긴다 (서버 · 브라우저 어디서나 import 가능).
 */
export type ProductType = "course" | "ebook" | "live" | "bundle";
export type L10n = Record<Locale, string>;

export type Lesson = { id: string; title: L10n; minutes: number; preview: boolean };

export type Product = {
  id: string;
  slug: string;
  type: ProductType;
  title: L10n;
  summary: L10n;
  meta: L10n;
  /** 원 */
  priceKrw: number;
  /** 센트 */
  priceUsdCents: number;
  /** 강의만. position 순서 */
  lessons: Lesson[];
};

export type Badge = { code: string; name: L10n };

/** 권한이 있을 때 갈 곳: 강의는 학습 화면, 전자책 · 라이브 · 번들은 마이페이지 */
export function ownedHref(slug: string, type: ProductType) {
  return type === "course" ? `/learn/${slug}` : "/account";
}

/** 금액은 DB와 같은 최소 단위(원 · 센트)로 받는다 */
export function formatAmount(minor: number, currency: "KRW" | "USD", locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", { style: "currency", currency }).format(
    currency === "USD" ? minor / 100 : minor,
  );
}

export function formatPrice(product: Product, locale: Locale) {
  return locale === "ko" ? formatAmount(product.priceKrw, "KRW", locale) : formatAmount(product.priceUsdCents, "USD", locale);
}
