import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/proxy";

const handleI18n = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1) 언어 감지 · /ko /en 리다이렉트  2) Supabase 로그인 세션 갱신
  const response = handleI18n(request);
  return updateSession(request, response);
}

export const config = {
  // API, Next 내부 경로, 확장자가 있는 파일(sitemap.xml, robots.txt, llms.txt 등)은 제외
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
