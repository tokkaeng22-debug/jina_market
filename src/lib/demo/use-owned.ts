"use client";

import { useAuth } from "@/lib/auth/use-auth";
import { useDemo, useHydrated } from "./store";

/**
 * 로그인한 사용자의 권한(더미). 로그아웃 상태면 비어 있다.
 * 결제를 연결하면 entitlements 조회로 바꾼다.
 */
export function useOwned() {
  const { owned } = useDemo();
  const hydrated = useHydrated();
  const { status } = useAuth();
  return { ready: hydrated && status !== "loading", owned: hydrated && status === "signedIn" ? owned : [] };
}
