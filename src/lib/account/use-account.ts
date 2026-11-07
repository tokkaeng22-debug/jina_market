"use client";

import { useEffect, useSyncExternalStore } from "react";
import { supabaseBrowser, useAuth } from "@/lib/auth/use-auth";

/**
 * 로그인한 사용자의 DB 기록: 권한(entitlements) · 주문(orders) · 배지(user_badges).
 * RLS가 본인 것만 돌려준다. 접근 권한은 entitlements로만 판단한다 (PLAN.md 5-1).
 */
export type DbOrderStatus = "pending" | "awaiting_deposit" | "paid" | "failed" | "refunded";
export type AccountOrder = {
  id: string;
  slug: string;
  status: DbOrderStatus;
  /** 최소 단위 (원 · 센트) */
  amount: number;
  currency: "KRW" | "USD";
  createdAt: number;
};
export type AccountData = { owned: string[]; orders: AccountOrder[]; badges: string[]; isAdmin: boolean };

type State = { userId: string | null; status: "idle" | "loading" | "ready"; data: AccountData };

const EMPTY: AccountData = { owned: [], orders: [], badges: [], isAdmin: false };
const IDLE: State = { userId: null, status: "idle", data: EMPTY };

let state: State = IDLE;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type Slug = { slug: string } | null;
type EntitlementRow = { expires_at: string | null; revoked_at: string | null; products: Slug };
type OrderRow = { id: string; status: DbOrderStatus; amount: number; currency: "KRW" | "USD"; created_at: string; products: Slug };
type BadgeRow = { badges: { code: string } | null };

async function load(userId: string) {
  set({ userId, status: "loading", data: EMPTY });
  const db = supabaseBrowser();
  try {
    const [ents, orders, badges, profile] = await Promise.all([
      db.from("entitlements").select("expires_at, revoked_at, products(slug)").eq("user_id", userId),
      db
        .from("orders")
        .select("id, status, amount, currency, created_at, products(slug)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db.from("user_badges").select("badges(code)").eq("user_id", userId).order("earned_at"),
      db.from("profiles").select("is_admin").eq("id", userId).maybeSingle(),
    ]);
    const error = ents.error ?? orders.error ?? badges.error ?? profile.error;
    if (error) throw error;
    if (state.userId !== userId) return; // 그사이 로그아웃 · 계정 전환

    const now = Date.now();
    const data: AccountData = {
      owned: (ents.data as unknown as EntitlementRow[])
        .filter((e) => !e.revoked_at && (!e.expires_at || Date.parse(e.expires_at) > now) && e.products)
        .map((e) => e.products!.slug),
      orders: (orders.data as unknown as OrderRow[])
        .filter((o) => o.products)
        .map((o) => ({
          id: o.id,
          slug: o.products!.slug,
          status: o.status,
          amount: o.amount,
          currency: o.currency,
          createdAt: Date.parse(o.created_at),
        })),
      badges: (badges.data as unknown as BadgeRow[]).flatMap((b) => (b.badges ? [b.badges.code] : [])),
      // 관리자 페이지 링크를 보여 줄지만 정한다. 실제 권한 확인은 서버가 한다
      isAdmin: profile.data?.is_admin === true,
    };
    set({ userId, status: "ready", data });
  } catch (err) {
    // 네트워크 오류 등: 빈 기록으로 보여 주고 화면은 멈추지 않게 한다
    console.error(err);
    if (state.userId === userId) set({ userId, status: "ready", data: EMPTY });
  }
}

/** 결제 확인 뒤처럼 기록이 바뀌었을 때 다시 읽는다 */
export function refreshAccount() {
  if (state.userId) return load(state.userId);
}

export function useAccount() {
  const { status: authStatus, user } = useAuth();
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId && state.userId !== userId) void load(userId);
    if (!userId && state.userId) set(IDLE);
  }, [userId]);

  const mine = userId !== null && snapshot.userId === userId;
  return {
    ready: authStatus !== "loading" && (!userId || (mine && snapshot.status === "ready")),
    data: mine ? snapshot.data : EMPTY,
  };
}
