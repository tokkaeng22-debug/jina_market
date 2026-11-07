"use client";

import { useAuth } from "@/lib/auth/use-auth";
import { useAccount } from "./use-account";

/** 로그인한 사용자가 권한(entitlements)을 가진 상품 slug. 로그아웃 상태면 비어 있다 (PLAN.md 5-1) */
export function useOwned() {
  const { status } = useAuth();
  const { ready, data } = useAccount();
  return { ready, owned: status === "signedIn" ? data.owned : [] };
}
