"use client";

import { useAuth } from "@/lib/auth/use-auth";
import { useDemo, useHydrated } from "@/lib/demo/store";
import { useAccount } from "./use-account";

/**
 * 로그인한 사용자가 권한을 가진 상품 slug. 로그아웃 상태면 비어 있다.
 * DB entitlements가 기준이고, 결제를 연결하기 전까지는 연습용 결제(localStorage)로 얻은 권한도 합친다.
 */
export function useOwned() {
  const { owned: demoOwned } = useDemo();
  const hydrated = useHydrated();
  const { status } = useAuth();
  const { ready, data } = useAccount();
  const owned = hydrated && status === "signedIn" ? [...new Set([...data.owned, ...demoOwned])] : [];
  return { ready: hydrated && ready, owned };
}
