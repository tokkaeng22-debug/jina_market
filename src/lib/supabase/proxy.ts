import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

/**
 * 요청마다 Supabase 로그인 세션 토큰을 갱신해 응답 쿠키에 싣는다.
 * Supabase 환경변수가 없으면 아무것도 하지 않는다.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const env = getSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 토큰 검증 + 만료 시 갱신. 이 호출과 createServerClient 사이에 다른 로직을 넣지 않는다.
  await supabase.auth.getClaims();

  return response;
}
