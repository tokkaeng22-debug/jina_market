/**
 * 사이트맵에 넣을 공개 정적 경로 (언어 접두사 제외).
 * 상품 페이지는 sitemap.ts가 DB에서 읽어 합친다. 블로그도 생기면 같은 방식으로 추가한다.
 * 작성 중이라 noindex인 페이지(약관 초안 등)는 여기에 넣지 않는다.
 */
export const publicStaticPaths: { path: string; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
];

/** 법정 문서: 초안 단계에서는 noindex. 정식 게시 후 true로 바꾸고 위 목록에 추가한다. */
export const legalDocsPublished = false;
