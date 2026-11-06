import type { Locale } from "@/i18n/routing";

/**
 * 더미 상품 데이터. Supabase `products` · `lessons` 테이블이 생기면 DB 조회로 교체한다.
 * 상품 내용은 화면 문구가 아니라 데이터라서 messages/*.json이 아닌 여기에 둔다.
 */
export type ProductType = "course" | "ebook" | "live";
type L10n = Record<Locale, string>;

export type DemoProduct = {
  slug: string;
  type: ProductType;
  title: L10n;
  summary: L10n;
  meta: L10n;
  priceKrw: number;
  priceUsd: number;
  lessons?: { title: L10n; minutes: number; preview?: boolean }[];
};

export const demoProducts: DemoProduct[] = [
  {
    slug: "notion-solo-business",
    type: "course",
    title: { ko: "노션으로 1인 사업 운영하기", en: "Run a Solo Business with Notion" },
    summary: {
      ko: "상품 페이지부터 고객 관리까지, 노션 하나로 1인 사업을 굴리는 방법을 차근차근 따라 해요.",
      en: "From product pages to customer care, run your whole solo business in Notion, step by step.",
    },
    meta: { ko: "6강 · 약 2시간 · 평생 소장", en: "6 lessons · about 2 hours · lifetime access" },
    priceKrw: 89000,
    priceUsd: 69,
    lessons: [
      { title: { ko: "시작하기: 오늘 만들 것", en: "Getting started: what we'll build" }, minutes: 8, preview: true },
      { title: { ko: "상품 페이지 만들기", en: "Build your product page" }, minutes: 22 },
      { title: { ko: "고객 관리 데이터베이스", en: "Customer database" }, minutes: 25 },
      { title: { ko: "결제 페이지 연결하기", en: "Connect a checkout page" }, minutes: 18 },
      { title: { ko: "자동화로 시간 아끼기", en: "Save time with automations" }, minutes: 24 },
      { title: { ko: "매주 운영 루틴 만들기", en: "Your weekly operating routine" }, minutes: 15 },
    ],
  },
  {
    slug: "first-digital-product",
    type: "ebook",
    title: { ko: "첫 디지털 상품 만들기", en: "Make Your First Digital Product" },
    summary: {
      ko: "아이디어 고르기부터 가격 정하기, 첫 판매까지. 바로 쓰는 체크리스트가 들어 있어요.",
      en: "Pick an idea, set a price, make your first sale. Includes ready-to-use checklists.",
    },
    meta: { ko: "PDF · 120쪽 · 업데이트 무료", en: "PDF · 120 pages · free updates" },
    priceKrw: 19000,
    priceUsd: 15,
  },
  {
    slug: "november-qna-live",
    type: "live",
    title: { ko: "11월 Q&A 라이브", en: "November Q&A Live" },
    summary: {
      ko: "미리 받은 질문에 하나씩 답하고, 남은 시간엔 화면을 같이 보며 고민을 풀어요.",
      en: "I answer your questions one by one, then we solve problems together on screen.",
    },
    meta: { ko: "11월 20일(목) 20:00 · 90분 · 정원 30명", en: "Nov 20 (Thu) 8 PM KST · 90 min · 30 seats" },
    priceKrw: 30000,
    priceUsd: 25,
  },
];

export function getDemoProduct(slug: string) {
  return demoProducts.find((p) => p.slug === slug);
}

/** 권한이 있을 때 갈 곳: 강의는 학습 화면, 전자책 · 라이브는 마이페이지 */
export function ownedHref(slug: string, type: ProductType) {
  return type === "course" ? `/learn/${slug}` : "/account";
}

export function formatPrice(product: DemoProduct, locale: Locale) {
  return locale === "ko"
    ? new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(product.priceKrw)
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(product.priceUsd);
}

export function formatAmount(amount: number, currency: "KRW" | "USD", locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", { style: "currency", currency }).format(amount);
}
