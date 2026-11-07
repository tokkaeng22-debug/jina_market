"use client";

import { useSyncExternalStore } from "react";
import { getDemoProduct } from "./products";

/**
 * 더미 UI용 상태 (브라우저 localStorage).
 * 로그인은 이미 Supabase Auth를 쓰고, 주문 · 권한은 결제를 연결할 때 orders · entitlements 테이블로 바꾼다 (PLAN.md 5-1).
 */
export type PayMethod = "card" | "easyPay" | "vbank" | "paypal";
export type OrderStatus = "pending" | "awaiting_deposit" | "paid";

export type DemoOrder = {
  id: string;
  slug: string;
  method: PayMethod;
  status: OrderStatus;
  amount: number;
  currency: "KRW" | "USD";
  createdAt: number;
};

export type DemoState = {
  orders: DemoOrder[];
  /** entitlements: 구매 권한이 있는 상품 slug */
  owned: string[];
  /** 강의별 완료한 강 수 */
  progress: Record<string, number>;
  submissions: { slug: string; lesson: number; body: string; createdAt: number }[];
  badges: string[];
};

const KEY = "jina-demo-v1";
const EMPTY: DemoState = { orders: [], owned: [], progress: {}, submissions: [], badges: [] };

let cache: { raw: string | null; state: DemoState } = { raw: null, state: EMPTY };
const listeners = new Set<() => void>();

function read(): DemoState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache.state;
  }
  if (raw === cache.raw) return cache.state;
  let state = EMPTY;
  try {
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Partial<DemoState>) };
  } catch {}
  cache = { raw, state };
  return state;
}

function write(next: DemoState) {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, raw);
  } catch {}
  cache = { raw, state: next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDemo() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** 서버 렌더 · 하이드레이션 중에는 false. localStorage 값으로 화면을 바꾸기 전에 확인한다 */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export const demo = {
  placeOrder(slug: string, method: PayMethod, currency: "KRW" | "USD"): DemoOrder {
    const s = read();
    const product = getDemoProduct(slug);
    const amount = product ? (currency === "KRW" ? product.priceKrw : product.priceUsd) : 0;
    const order: DemoOrder = {
      id: `JM-${Date.now().toString(36).toUpperCase()}`,
      slug,
      method,
      status: method === "vbank" ? "awaiting_deposit" : "pending",
      amount,
      currency,
      createdAt: Date.now(),
    };
    write({ ...s, orders: [order, ...s.orders] });
    return order;
  },
  /** 결제 확인 → 권한 부여. 실제 grantEntitlements()처럼 여러 번 불러도 결과가 같다 */
  confirmOrder(id: string) {
    const s = read();
    const order = s.orders.find((o) => o.id === id);
    if (!order) return;
    const orders = s.orders.map((o) => (o.id === id ? { ...o, status: "paid" as const } : o));
    const owned = s.owned.includes(order.slug) ? s.owned : [...s.owned, order.slug];
    const badges = s.badges.includes("first-purchase") ? s.badges : [...s.badges, "first-purchase"];
    write({ ...s, orders, owned, badges });
  },
  completeLesson(slug: string, total: number) {
    const s = read();
    const done = Math.min(total, (s.progress[slug] ?? 0) + 1);
    write({ ...s, progress: { ...s.progress, [slug]: done } });
  },
  submitAssignment(slug: string, lesson: number, body: string) {
    const s = read();
    write({ ...s, submissions: [{ slug, lesson, body, createdAt: Date.now() }, ...s.submissions] });
  },
  reset() {
    write(EMPTY);
  },
};
