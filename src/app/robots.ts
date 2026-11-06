import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/** 로그인 · 결제 · 관리자 영역. 모든 크롤러에 공통으로 막는다. */
const privatePaths = [
  "/api/",
  "/*/learn",
  "/*/account",
  "/*/checkout",
  "/*/admin",
  "/*/assignments",
];

/**
 * 생성형 AI 검색 · 답변 엔진 크롤러 (GEO).
 * 공개 콘텐츠는 인용될 수 있도록 허용하고, 비공개 영역만 막는다.
 */
const aiCrawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production";

  // 프리뷰 · 스테이징 배포는 색인되지 않도록 전부 막는다.
  if (!isProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      { userAgent: aiCrawlers, allow: "/", disallow: privatePaths },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
