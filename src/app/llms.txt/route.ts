import { siteConfig } from "@/config/site";
import { localizedUrl } from "@/lib/seo/metadata";

/**
 * /llms.txt — AI 모델이 사이트를 빠르게 이해하도록 돕는 요약 (llmstxt.org 형식).
 * 상품 · 블로그가 생기면 섹션에 링크를 추가한다.
 */
export function GET() {
  const body = `# ${siteConfig.name}

> ${siteConfig.author.description.en} ${siteConfig.author.name} sells their own online video courses, ebooks and live sessions in Korean and English.

${siteConfig.author.description.ko}

## Main pages

- [Home (Korean)](${localizedUrl("ko", "/")}): 홈
- [Home (English)](${localizedUrl("en", "/")}): Home

## Policies

- [Terms of Service](${localizedUrl("en", "/terms")})
- [Privacy Policy](${localizedUrl("en", "/privacy")})
- [Refund Policy](${localizedUrl("en", "/refund")})
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
