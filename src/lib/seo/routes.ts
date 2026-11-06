/**
 * 사이트맵에 넣을 공개 정적 경로 (언어 접두사 제외).
 * 상품 · 블로그 같은 동적 경로는 DB가 생기면 sitemap.ts에서 추가로 합친다.
 * 작성 중이라 noindex인 페이지(약관 초안 등)는 여기에 넣지 않는다.
 */
export const publicStaticPaths: { path: string; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
];

/** 법정 문서: 초안 단계에서는 noindex. 정식 게시 후 true로 바꾸고 위 목록에 추가한다. */
export const legalDocsPublished = false;
