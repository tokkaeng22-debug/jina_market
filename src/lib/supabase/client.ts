"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";

/** 클라이언트 컴포넌트용 Supabase 클라이언트 */
export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase 환경변수가 없습니다.");
  }
  return createBrowserClient(env.url, env.key);
}
