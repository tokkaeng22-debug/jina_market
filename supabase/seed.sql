-- 첫 데이터: 배지 2개 + 더미 UI와 같은 상품 3개 (src/lib/demo/products.ts)
-- 실행: migrations/20261107000000_init.sql을 먼저 실행한 뒤, 이 파일을 SQL Editor에서 Run.
-- 여러 번 실행해도 중복되지 않는다.

insert into public.badges (code, name_ko, name_en, rule) values
  ('signup', '반짝 첫걸음', 'First Sparkle', '가입'),
  ('first-purchase', '첫 수강 시작', 'First Class', '첫 결제')
on conflict (code) do nothing;

insert into public.products
  (type, slug, status, title_ko, title_en, summary_ko, summary_en, meta_ko, meta_en, price_krw, price_usd_cents)
values
  ('course', 'notion-solo-business', 'published',
   '노션으로 1인 사업 운영하기', 'Run a Solo Business with Notion',
   '상품 페이지부터 고객 관리까지, 노션 하나로 1인 사업을 굴리는 방법을 차근차근 따라 해요.',
   'From product pages to customer care, run your whole solo business in Notion, step by step.',
   '6강 · 약 2시간 · 평생 소장', '6 lessons · about 2 hours · lifetime access',
   89000, 6900),
  ('ebook', 'first-digital-product', 'published',
   '첫 디지털 상품 만들기', 'Make Your First Digital Product',
   '아이디어 고르기부터 가격 정하기, 첫 판매까지. 바로 쓰는 체크리스트가 들어 있어요.',
   'Pick an idea, set a price, make your first sale. Includes ready-to-use checklists.',
   'PDF · 120쪽 · 업데이트 무료', 'PDF · 120 pages · free updates',
   19000, 1500),
  ('live', 'november-qna-live', 'published',
   '11월 Q&A 라이브', 'November Q&A Live',
   '미리 받은 질문에 하나씩 답하고, 남은 시간엔 화면을 같이 보며 고민을 풀어요.',
   'I answer your questions one by one, then we solve problems together on screen.',
   '11월 20일(목) 20:00 · 90분 · 정원 30명', 'Nov 20 (Thu) 8 PM KST · 90 min · 30 seats',
   30000, 2500)
on conflict (slug) do nothing;

insert into public.lessons (product_id, position, title_ko, title_en, duration_sec, is_preview)
select p.id, l.position, l.title_ko, l.title_en, l.minutes * 60, l.is_preview
  from public.products p
  cross join (values
    (1, '시작하기: 오늘 만들 것', 'Getting started: what we''ll build', 8, true),
    (2, '상품 페이지 만들기', 'Build your product page', 22, false),
    (3, '고객 관리 데이터베이스', 'Customer database', 25, false),
    (4, '결제 페이지 연결하기', 'Connect a checkout page', 18, false),
    (5, '자동화로 시간 아끼기', 'Save time with automations', 24, false),
    (6, '매주 운영 루틴 만들기', 'Your weekly operating routine', 15, false)
  ) as l(position, title_ko, title_en, minutes, is_preview)
 where p.slug = 'notion-solo-business'
on conflict (product_id, position) do nothing;

insert into public.live_sessions (product_id, starts_at, duration_min, capacity)
select p.id, '2026-11-20 20:00:00+09', 90, 30
  from public.products p
 where p.slug = 'november-qna-live'
   and not exists (select 1 from public.live_sessions s where s.product_id = p.id);
