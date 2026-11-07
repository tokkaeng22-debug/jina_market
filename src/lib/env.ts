import { z } from "zod";

/**
 * 공개(브라우저 노출) 환경변수. 0단계에서는 Supabase 값이 없어도 사이트가 뜨도록 optional로 둔다.
 * Next는 NEXT_PUBLIC_* 값을 빌드 시점에 인라인하므로 process.env.X 형태로 하나씩 읽어야 한다.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  /** PortOne 상점 아이디 · 채널 키 (공개 값). 테스트 채널 → 실연동 채널로 바꿀 때 이 값만 바꾼다 */
  NEXT_PUBLIC_PORTONE_STORE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_PORTONE_CHANNEL_KEY: z.string().min(1).optional(),
});

/** 도메인 연결 전에는 Vercel이 주는 실서비스 주소(*.vercel.app)를 기본값으로 쓴다 */
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || vercelProductionUrl,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  NEXT_PUBLIC_PORTONE_STORE_ID: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || undefined,
  NEXT_PUBLIC_PORTONE_CHANNEL_KEY: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || undefined,
});

/** 사이트 기본 URL (끝 슬래시 없음) */
export const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/** Vercel 실서비스 배포(또는 로컬 production 빌드)인지. 프리뷰 배포는 false */
export const isProductionDeploy = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";

/**
 * 검색엔진 · AI 크롤러에 사이트를 공개할지.
 * 정식 오픈 전까지는 실서비스 배포도 막고, 오픈할 때 Vercel 환경변수 SITE_INDEXABLE=true만 넣으면 풀린다.
 */
export const siteIndexable = isProductionDeploy && process.env.SITE_INDEXABLE === "true";

/** Supabase 설정이 있으면 반환, 없으면 null (로컬에서 Supabase 없이 개발 가능) */
export function getSupabaseEnv() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

/** PortOne 결제창 설정이 있으면 반환, 없으면 null (결제 버튼을 막는다) */
export function getPortOneEnv() {
  const storeId = publicEnv.NEXT_PUBLIC_PORTONE_STORE_ID;
  const channelKey = publicEnv.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
  return storeId && channelKey ? { storeId, channelKey } : null;
}
