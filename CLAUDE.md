@AGENTS.md

# jina_market

1인 크리에이터의 디지털 상품(동영상 강의 · 전자책 · 라이브) 직판 사이트. 국내(ko, KRW) + 해외(en, USD).

- 기획: `docs/PLAN.md` (스택, 데이터 모델, 결제→entitlement 흐름 5-1절, 로드맵)
- 디자인: `docs/DESIGN_BRIEF.md`, 와이어프레임 `docs/wireframes.html`, 마스코트 "반짝"
- 명령: `npm run dev` · `npm run build` · `npm run lint`

## 규칙
- Next.js 16: `middleware` 대신 `src/proxy.ts`, `params`는 `await`. 코드 작성 전 `node_modules/next/dist/docs/`를 확인한다.
- `cacheComponents` 켜짐: 렌더링 중 `new Date()` · `Math.random()` 금지, 페이지 · 레이아웃에서 `setRequestLocale(locale)` 호출.
- 모든 공개 페이지는 `pageMetadata()`(canonical · hreflang · robots)를 쓴다. 비공개 화면은 `noindex: true`.
- 사업자 · 운영자 정보는 `src/config/site.ts` 한 곳에서만 수정한다.
- 화면 문구는 `messages/ko.json` · `messages/en.json`에 둔다 (하드코딩 금지).
- 접근 권한은 `entitlements` 테이블로만 판단한다 (PLAN.md 5-1).
