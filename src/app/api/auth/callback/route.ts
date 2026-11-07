import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 우리 사이트 안의 경로만 허용한다 (다른 사이트로 튕기는 오픈 리다이렉트 방지) */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

/**
 * 간편 로그인 · 가입 확인 메일에서 돌아오는 곳.
 * - OAuth, 가입 확인 링크(기본 템플릿): ?code=... → 세션으로 교환
 * - 가입 확인 링크(token_hash 템플릿): ?token_hash=...&type=... → 확인
 * 성공하든 실패하든 원래 보던 페이지(next)로 돌려보낸다. 실패하면 그 페이지에서 다시 로그인하면 된다.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createSupabaseServerClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const target = new URL(next, url.origin);
  if (!ok) target.searchParams.set("login", "retry");
  return NextResponse.redirect(target);
}
