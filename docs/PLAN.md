# jina_market 최종 기획안 (v1.0 · 2026-11-06)

1인 크리에이터의 디지털 상품 직판 사이트. 플랫폼(다중 판매자)이 아니며 판매자는 운영자 1명이다.

## 1. 요구사항 요약

| 항목 | 내용 |
|---|---|
| 상품 | ① 온라인 동영상 강의 ② 전자책 ③ 라이브 미팅 |
| 시장 | 국내(KRW) + 해외(USD) |
| 규모 | 동시 접속 최대 1,000명 |
| 커뮤니티 | 운영자 콘텐츠 게시판(공개) + 수강생 과제 제출 게시판(비공개) |
| 검색 | 사이트 전체 테크니컬 SEO · AEO · GEO |
| 스토리지 | Cloudflare (R2 · Stream · Images) |

## 2. 최종 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js (App Router) + TypeScript** | SSG/ISR로 공개 페이지, SSR로 개인화 페이지 |
| UI | Tailwind CSS + shadcn/ui | 디자인 토큰은 Claude Design 결과물에서 이식 |
| 다국어 | **next-intl**, `/ko` · `/en` 경로 | hreflang · 통화 자동 전환 |
| DB · 인증 | **Supabase** (Postgres + Auth + RLS) | 카카오 · 구글 · 이메일 로그인. 파일 저장은 쓰지 않음 |
| 동영상 | **Cloudflare Stream** | Signed URL(JWT) + 도메인 제한 + 플레이어 위 이메일 워터마크 |
| 전자책 · 과제 파일 | **Cloudflare R2** | 서버에서 Presigned URL 발급(업로드 · 다운로드 모두), egress 무료 |
| 이미지 | **Cloudflare Images** | 썸네일 · 게시판 이미지 리사이즈 / WebP·AVIF |
| DNS · CDN · 보안 | **Cloudflare** DNS + Turnstile(봇 방지) | 호스팅이 Vercel이면 DNS는 *DNS only*(회색 구름) |
| 호스팅 | **Vercel** (기본) / Cloudflare Workers + OpenNext (대안) | Cloudflare 일원화를 원하면 대안으로 전환 가능 |
| 국내 결제 | **PortOne V2 + 토스페이먼츠** | 카드 · 카카오페이 · 네이버페이 · 토스페이 · 가상계좌 |
| 해외 결제 | **Lemon Squeezy** (Merchant of Record) | 카드 · **PayPal** · Apple Pay 포함, 전 세계 VAT/세금 대행 |
| 라이브 | **Zoom API** (Meeting Registration) | 결제 완료 → 등록 → 개인 참가 링크 발송 |
| 에디터 | Tiptap | 게시판 · 과제 |
| 이메일 / 알림 | Resend / 카카오 알림톡(솔라피) | 해외는 이메일만 |
| 모니터링 · 분석 | Sentry · GA4 · Search Console · 네이버 서치어드바이저 · Bing | |

### 2-1. 해외 결제: PayPal vs Lemon Squeezy

| | PayPal 직접 연동 | Lemon Squeezy |
|---|---|---|
| 역할 | 결제 대행만 | **판매 대행(MoR)**: 법적 판매자가 LS |
| 해외 VAT · 판매세 | **내가** 국가별로 신고 · 납부 | LS가 대신 징수 · 납부 |
| 결제 수단 | PayPal 계정 · 카드 | 카드 · PayPal · Apple/Google Pay |
| 수수료(대략) | 약 4.4% + 고정 수수료 + 환전 | 약 5% + $0.50 (+해외 카드 추가 수수료) |
| 디지털 상품 배송 · 라이선스 | 직접 구현 | 기본 제공(웹훅으로 우리 DB에 권한 부여) |

**결론: 해외는 Lemon Squeezy 하나로 연동한다.** Lemon Squeezy 결제창이 PayPal을 지원하므로 PayPal을 따로 붙이지 않아도 된다. 1인 운영자에게 국가별 디지털 세금(EU VAT 등) 신고 부담을 없애주는 것이 가장 큰 이점이다.

- 리스크: Lemon Squeezy는 2024년 Stripe에 인수되었다. 계약 전 신규 가입 · 지급(한국 계좌 정산) 정책을 확인하고, 문제가 있으면 **Paddle** 또는 **Polar**(같은 MoR 모델)로 교체한다.
- 교체에 대비해 결제는 `PaymentProvider` 인터페이스로 추상화한다(`portone`, `lemonsqueezy`). 주문 · 권한 테이블은 공급자와 무관하게 설계한다.
- 통화 결정: IP 국가(Cloudflare `CF-IPCountry` 또는 Vercel geo) + 언어 기본값. 결제 페이지에서 사용자가 바꿀 수 있다. KR → PortOne(KRW), 그 외 → Lemon Squeezy(USD).

## 3. 아키텍처

```
[브라우저] ─ Cloudflare DNS/Turnstile
   │
   ├─ Next.js (Vercel)
   │    ├─ 공개 페이지: SSG/ISR (홈, 상품 상세, 블로그, FAQ)  → CDN 캐시
   │    ├─ 개인 페이지: SSR (내 강의, 과제, 마이페이지)
   │    └─ Route Handlers: 결제 웹훅, 서명 URL 발급, Zoom 연동
   │
   ├─ Supabase Postgres (RLS)  ← 사용자 · 상품 · 주문 · 권한 · 게시판
   ├─ Cloudflare Stream        ← 강의 영상 (서명 토큰 재생)
   ├─ Cloudflare R2            ← 전자책 PDF, 과제 첨부, 강의 자료
   ├─ PortOne / Lemon Squeezy  → 웹훅 → 주문 확정 → entitlement 생성
   └─ Zoom API                 ← 라이브 등록 · 녹화본 → Stream 업로드
```

**1,000명 동시 접속 대응**: 트래픽 대부분은 CDN(정적 페이지 · Stream · R2)이 처리하므로 원 서버 부하는 로그인 · 결제 · 게시판 요청뿐이다. Supabase는 Supavisor(트랜잭션 모드) 커넥션 풀러를 쓰고, 라이브 오픈 같은 순간 트래픽은 출시 전 k6로 1,000 VU 부하 테스트를 한다.

## 4. 데이터 모델 (핵심)

| 테이블 | 주요 필드 |
|---|---|
| `profiles` | id, name, locale, country, marketing_opt_in |
| `products` | id, type(`course`·`ebook`·`live`), slug, title_ko/en, price_krw, price_usd, ls_variant_id, status, seo 필드 |
| `bundles` / `bundle_items` | 번들 상품 구성 |
| `course_sections` / `lessons` | 순서, stream_video_uid, duration, is_preview, transcript |
| `ebook_files` | r2_key, format(pdf·epub), version |
| `live_sessions` | starts_at, capacity, zoom_meeting_id, recording_product_id |
| `orders` | user_id, provider, provider_order_id, currency, amount, status(`pending`·`awaiting_deposit`·`paid`·`failed`·`refunded`) |
| `entitlements` | user_id, product_id, source_order_id, expires_at, revoked_at (**접근 권한의 단일 기준**) |
| `lesson_progress` | user_id, lesson_id, position_sec, completed |
| `posts` | board(`notice`·`blog`·`assignment`), author_id, product_id, visibility, body |
| `submissions` | post_id, user_id, status(제출·검토중·완료), feedback |
| `coupons` | code, discount, currency, valid_until, usage_limit |
| `badges` / `user_badges` | code, name_ko/en, image, rule(가입 · 첫 결제 · 연속 학습 N일 · 수료 등) / user_id, badge_id, earned_at |

RLS 원칙: 강의 · 전자책 · 과제 데이터는 `entitlements`에 유효한 행이 있는 사용자만 읽을 수 있다. 과제 제출물은 작성자 본인과 관리자만 볼 수 있다.

## 5. 상품별 기능

### 동영상 강의
- 커리큘럼(섹션 → 레슨), 미리보기 레슨 공개
- Stream 서명 토큰(유효 1~2시간), 허용 도메인 제한, 화면에 구매자 이메일 워터마크
- 동시 세션 제한(계정당 기기 2대), 진도율 · 이어보기, 수강 기간
- 레슨별 자료 다운로드(R2), 자막/스크립트(공개 미리보기 분은 SEO 페이지로 활용)

### 전자책
- 목차 + 샘플 챕터 공개 페이지
- 다운로드할 때 서버에서 PDF 각 페이지 하단에 구매자 이메일과 주문번호를 워터마크로 넣는다 (pdf-lib)
- 다운로드 횟수(예: 5회) · 기간 제한, 개정판 업데이트 알림

### 라이브 미팅
- 일정(사용자 시간대 자동 변환), 정원 · 마감, 대기 명단
- 결제 → Zoom 등록 → 개인 링크 + `.ics` 캘린더 파일 메일 발송, 24시간 전 · 1시간 전 리마인더
- 종료 후 녹화본을 Stream으로 옮겨 "다시보기"로 제공하거나 별도 상품화

## 5-1. 결제 → 권한(entitlement) 자동 부여 → 마이페이지

**원칙: 접근 권한은 `entitlements` 한 곳에서만 판단하고, 부여는 서버의 단일 함수 `grantEntitlements(order)`만 수행한다.**

1. **결제 전**: 로그인을 필수로 한다. 홈 · 상품 상세는 로그인 없이 보고, 비로그인 상태로 "구매하기"를 누르면 결제 화면 위에 로그인 창을 띄운다(페이지 이동 없음). 창에는 카카오 · Google 간편 로그인을 위에, 이메일 로그인을 아래에 둔다. 로그인하면 창만 닫히고 그 결제 화면에서 이어간다. 서버가 `orders`에 `pending` 주문을 만들고 금액을 확정한다.
   - PortOne: `paymentId` = 우리 주문번호, `customData`에 user_id 전달
   - Lemon Squeezy: `checkout_data.custom`에 user_id · order_id 전달, 결제 후 이동 주소는 우리 결제 확인 페이지로 설정
2. **결제 확인 (두 경로, 먼저 오는 쪽이 처리)**:
   - **복귀 경로**: 결제창에서 돌아오면 서버가 결제사 API로 결제 상태를 직접 조회한다. 클라이언트가 보낸 값은 믿지 않는다.
   - **웹훅 경로**: PortOne과 Lemon Squeezy 웹훅의 서명(HMAC)을 검증한다.
   - 공통 검증: 결제 금액 · 통화가 주문과 같은지, 회원 ID가 같은지 확인한다.
3. **부여**: `orders.status = paid`로 바꾸고 `grantEntitlements` 실행.
   - 중복 방지: `orders(provider, provider_order_id)` UNIQUE, `entitlements(user_id, product_id, source_order_id)` UNIQUE → 웹훅 재전송 · 동시 도착에도 한 번만 부여
   - 번들 → 구성 상품마다 1행
   - 강의 `expires_at` = 결제일 + 수강 기간
   - 라이브 → entitlement를 주고 Zoom 등록 작업을 큐에 넣는다 (실패하면 재시도, 관리자에게 알림)
4. **화면 이동**: 결제 확인 페이지가 주문 상태를 1~2초 간격으로 확인한다.
   - `paid`: 결제 완료 화면으로 이동한다 (첫 강의 보기 · 전자책 다운로드 · 마이페이지).
   - 10초가 지나도 미확정: "확인 중" 안내를 보여주고 이메일로 결과를 보낸다.
5. **가상계좌**: 주문을 `awaiting_deposit`으로 두고 입금 웹훅이 오면 3번을 실행한다. 이메일 · 알림톡으로 "수강 가능" 알림을 보낸다.
6. **환불 · 취소 · 차지백**: 환불 웹훅이 오면 `entitlements.revoked_at`을 기록하고 접근을 차단한다. 전자책 다운로드 링크도 무효화한다.
7. **상품 상세**: 유효한 entitlement가 있으면 "구매" 대신 "이어서 학습하기" 버튼을 보여준다.
8. **테스트 (1단계 완료 기준에 추가)**: 다음 6가지를 확인한다.
   - 국내 카드 결제
   - 해외 결제 (Lemon Squeezy 테스트 모드)
   - 가상계좌 입금
   - 웹훅 중복 전송
   - 웹훅이 복귀보다 늦게 도착하는 경우
   - 환불 후 접근 차단

## 6. 게시판

| | 콘텐츠 게시판 (블로그 · 공지) | 과제 게시판 |
|---|---|---|
| 작성 | 운영자 | 수강생(제출) · 운영자(과제 출제 · 피드백) |
| 접근 | 전체 공개 | 해당 상품 수강생, 제출물은 본인 · 운영자만 |
| 색인 | **index** (핵심 SEO · GEO 자산) | **noindex**, 로그인 필수 |
| 기능 | 카테고리 · 태그, 관련 상품 CTA, 작성자 박스, 수정일 | 파일 첨부(R2, 최대 50MB), 상태 관리, 피드백 댓글, 마감일 |

## 7. SEO · AEO · GEO

### 테크니컬 SEO
- 모든 공개 페이지는 SSR/SSG. 네이버 Yeti도 JS 없이 전체 본문을 읽을 수 있어야 한다
- `generateMetadata`로 title · description · canonical · OG · Twitter 설정
- **hreflang**: `ko`, `en`, `x-default`. 언어별 sitemap 자동 생성
- `robots.txt`: 비공개 경로(`/learn`, `/account`, `/api`, 과제)는 차단
- Core Web Vitals 목표: LCP < 2.5s, INP < 200ms, CLS < 0.1 (Vercel Speed Insights로 측정)
- 등록: Google Search Console, 네이버 서치어드바이저, Bing(IndexNow)

### 구조화 데이터 (JSON-LD)
| 페이지 | 스키마 |
|---|---|
| 전역 | `Organization`, `Person`(운영자, sameAs로 SNS 연결), `WebSite` |
| 강의 | `Course` + `Offer`(KRW·USD) + `hasCourseInstance` |
| 전자책 | `Book` + `Product` + `Offer` |
| 라이브 | `Event` (`eventAttendanceMode: Online`) + `Offer` |
| 블로그 | `Article` / `BlogPosting`, `BreadcrumbList` |
| FAQ · 상품 Q&A | `FAQPage` |
| 유료 미리보기 | `isAccessibleForFree: false` + `hasPart` 페이월 마크업 |

### AEO
- 글 구조: 질문형 H2 → 첫 2~3문장에 결론 → 근거 · 예시
- 모든 상품 상세에 FAQ 블록(대상, 수강 기간, 환불, 난이도, 준비물)

### GEO
- `/llms.txt`(사이트 개요 · 핵심 페이지 링크), `/llms-full.txt`(공개 핵심 글 본문)
- robots.txt에서 GPTBot · ClaudeBot · PerplexityBot · Google-Extended를 공개 콘텐츠에 한해 허용
- 이름 · 브랜드 · 전문 분야를 전 페이지에서 일관되게 표기, About 페이지에 경력 · 근거 명시
- 출처가 있는 수치, 작성일 · 수정일, 영어판 콘텐츠로 해외 AI 검색 노출

## 8. 운영 · 법무

- 사업자등록, 통신판매업 신고
- **전 페이지 공통 푸터** (와이어프레임 "홈 하단 · 푸터"):
  - 사업자 표시 (전자상거래법 제10조): 상호, 대표자, 주소, 전화 · 이메일, 사업자등록번호, 통신판매업 신고번호, 호스팅 제공자
  - "사업자정보확인" 링크 → 공정위 사업자 정보 공개 페이지
  - 법정 링크: 이용약관, **개인정보처리방침**(굵게 · 색으로 구분), 환불정책
  - 영어판: Terms · Privacy · Refund Policy와 "Lemon Squeezy is our Merchant of Record" 고지, EU 방문자용 쿠키 설정 링크
- 가상계좌를 쓰면 구매안전서비스(에스크로) 의무 여부를 토스페이먼츠와 확인한다. 정보통신망으로 전송되는 디지털 콘텐츠는 면제 조항이 있다.
- **디지털 콘텐츠 청약철회 제한 고지**: 결제 전 체크박스로 동의받기 (전자상거래법 제17조 제2항 제5호)
- 이용약관 · 개인정보처리방침 · 환불 규정 (한국어/영어). 해외 판매분은 Lemon Squeezy 약관도 함께 적용
- 해외 판매분: MoR 구조라 해외 VAT는 LS가 처리. 국내 소득 신고 방식은 세무사와 확인
- 쿠키 동의 배너(EU 방문자 대상)

## 9. 성장 전략
1. **리드 마그넷**: 무료 미니 강의 · 전자책 샘플 → 이메일 · 카카오 채널 구독
2. **번들 · 가격 정책**: 강의 + 전자책 + 라이브 Q&A 번들, 얼리버드, 쿠폰
3. **콘텐츠 → 상품 퍼널**: 블로그 글마다 관련 상품 CTA
4. **후기 수집**: 수강 완료 시 후기 요청 → 상품 상세에 노출
5. **퍼널 추적**: GA4 이벤트 `view_item → begin_checkout → purchase`
6. **마스코트 + 배지 게이미피케이션**: 전용 3D 마스코트가 학습 이벤트(이어보기 · 과제 · 수료)마다 응원하고, 연속 학습 · 수료 배지로 완강률과 재구매를 끌어올립니다. 디자인 방향은 `DESIGN_BRIEF.md`를 따릅니다.

## 10. 개발 로드맵

| 단계 | 범위 | 완료 기준 |
|---|---|---|
| 0. 기반 | Next.js · Supabase · next-intl · Cloudflare 연결, SEO 골격(메타 · sitemap · JSON-LD 헬퍼) | ko/en 빈 페이지가 배포되고 Search Console에 등록됨 |
| 1. 결제 + 전자책 | 상품 · 주문 · entitlement, PortOne · Lemon Squeezy 웹훅, R2 워터마크 다운로드 | 국내 · 해외 테스트 결제 후 전자책 다운로드 성공 |
| 2. 동영상 강의 | Stream 업로드 · 서명 재생, 커리큘럼, 진도율 | 구매자만 재생, 비구매자는 미리보기만 |
| 3. 게시판 · 과제 | 블로그(공개) · 과제(비공개), 파일 첨부, 피드백 | 과제 제출 → 피드백 → 알림 |
| 4. 라이브 | Zoom 연동, 정원, 리마인더, 녹화본 처리 | 결제 → 링크 수신 → 참석 |
| 5. 관리자 · 성장 | 대시보드, 쿠폰, 번들, 리드 마그넷, 배지 | 운영 업무를 관리자 화면에서 처리 |
| 6. 출시 준비 | 부하 테스트(1,000 VU), 법무 페이지, llms.txt, CWV 튜닝 | 출시 체크리스트 통과 |

## 11. 화면 목록 (와이어프레임 대상)

공개: 홈, 상품 목록, 강의 상세, 전자책 상세, 라이브 상세, 블로그 목록/글, About, FAQ
결제: 장바구니 없이 바로 결제하는 체크아웃 (국내/해외 분기)
회원: 내 학습(대시보드), 레슨 플레이어, 과제 게시판/제출, 마이페이지(주문 · 다운로드)
관리자: 대시보드, 상품 관리, 과제 검토

와이어프레임은 `docs/wireframes.html`을, 디자인 의뢰서는 `docs/DESIGN_BRIEF.md`를 참고한다.
