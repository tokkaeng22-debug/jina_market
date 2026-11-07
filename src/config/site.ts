/**
 * 사이트 · 운영자 · 사업자 정보의 단일 출처.
 * 푸터(전자상거래법 제10조 표시), JSON-LD, llms.txt가 모두 여기서 값을 읽는다.
 * [대괄호] 값은 사업자등록 · 통신판매업 신고 후 실제 값으로 바꿔야 한다.
 */
export const siteConfig = {
  name: "Make & Grow",
  legalName: "[상호명]",
  /** 푸터 저작권 연도 (렌더링 중 new Date()를 쓰지 않도록 고정값) */
  copyrightYear: 2026,
  /** 운영자 (E-E-A-T · GEO 신뢰 신호) */
  author: {
    name: "[운영자 이름]",
    jobTitle: { ko: "[직함 · 전문 분야]", en: "[Title · Expertise]" },
    description: {
      ko: "[운영자 소개 한두 문장]",
      en: "[One or two sentences about the creator]",
    },
  },
  /** 외부 프로필 (JSON-LD sameAs). 채널이 생기면 URL을 추가한다. */
  sameAs: [] as string[],
  business: {
    representative: "[대표자명]",
    registrationNumber: "[000-00-00000]",
    mailOrderNumber: "[제0000-지역-0000호]",
    address: "[사업장 주소]",
    email: "[contact@example.com]",
    phone: "[000-0000-0000]",
    hostingProvider: "Vercel Inc.",
  },
} as const;

/** 공정위 사업자 정보 공개 페이지 (사업자등록번호 숫자만 넣어 조회) */
export function businessCheckUrl(registrationNumber: string) {
  const digits = registrationNumber.replace(/\D/g, "");
  return digits.length === 10
    ? `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${digits}`
    : "https://www.ftc.go.kr/www/selectBizCommList.do?key=255";
}
