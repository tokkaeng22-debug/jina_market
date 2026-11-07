import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

/**
 * 서버 전용 관리자 클라이언트 (secret key, RLS 우회).
 * 주문 생성 · 결제 확인 · 권한 부여처럼 사용자가 직접 쓸 수 없는 작업에만 쓴다.
 * 이 파일을 클라이언트 컴포넌트에서 import하면 빌드가 실패한다 (server-only).
 */
export function createSupabaseAdminClient() {
  const env = getSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!env || !secret) throw new Error("SUPABASE_SECRET_KEY가 없습니다.");
  return createClient(env.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
