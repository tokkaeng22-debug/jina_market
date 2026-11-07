-- jina_market 초기 스키마 (docs/PLAN.md 4절 · 5-1절)
--
-- 원칙
-- 1. 접근 권한은 entitlements 한 곳에서만 판단한다.
-- 2. 주문 · 권한 · 쿠폰은 브라우저에서 직접 쓰지 못한다. 서버(SUPABASE_SECRET_KEY)만 쓴다.
-- 3. 권한 부여는 grant_entitlements(order_id) 함수 하나로만 한다. 같은 주문에 여러 번 불러도 한 번만 부여된다.
-- 4. 금액은 최소 단위 정수로 저장한다. KRW는 원, USD는 센트 (69달러 = 6900).
--
-- 실행: Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여 넣고 Run.

-- ───────────────────────────────────────────────────────────
-- 0. 타입
-- ───────────────────────────────────────────────────────────
create type public.product_type as enum ('course', 'ebook', 'live', 'bundle');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.currency_code as enum ('KRW', 'USD');
create type public.payment_provider as enum ('portone', 'lemonsqueezy', 'manual');
create type public.order_status as enum ('pending', 'awaiting_deposit', 'paid', 'failed', 'refunded');
create type public.ebook_format as enum ('pdf', 'epub');
create type public.post_board as enum ('notice', 'blog', 'assignment');
create type public.submission_status as enum ('submitted', 'reviewing', 'done');

-- ───────────────────────────────────────────────────────────
-- 1. 공통 함수
-- ───────────────────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────────────────────────────────────────
-- 2. 회원
-- ───────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  locale text not null default 'ko' check (locale in ('ko', 'en')),
  country text,
  marketing_opt_in boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- 관리자 여부. RLS 정책 안에서 쓴다.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- 회원이 is_admin을 스스로 켜지 못하게 막는다.
create function public.guard_profile_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'is_admin can only be changed by an admin';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin before update on public.profiles
  for each row execute function public.guard_profile_admin();

-- ───────────────────────────────────────────────────────────
-- 3. 상품
-- ───────────────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  type public.product_type not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.product_status not null default 'draft',
  title_ko text not null,
  title_en text not null,
  summary_ko text,
  summary_en text,
  meta_ko text,
  meta_en text,
  price_krw integer not null check (price_krw >= 0),
  price_usd_cents integer not null check (price_usd_cents >= 0),
  -- 수강 기간(일). null이면 평생 소장
  access_days integer check (access_days > 0),
  ls_variant_id text,
  seo_title_ko text,
  seo_title_en text,
  seo_description_ko text,
  seo_description_en text,
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- 번들 = type이 'bundle'인 상품. 구성 상품을 여기 적는다.
create table public.bundle_items (
  bundle_id uuid not null references public.products (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  primary key (bundle_id, product_id),
  check (bundle_id <> product_id)
);

-- ───────────────────────────────────────────────────────────
-- 4. 강의
-- ───────────────────────────────────────────────────────────
create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  position integer not null,
  title_ko text not null,
  title_en text not null,
  unique (product_id, position)
);

-- 커리큘럼(제목 · 길이)은 공개. 영상 · 스크립트는 lesson_media에 따로 둔다.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  section_id uuid references public.course_sections (id) on delete set null,
  position integer not null,
  title_ko text not null,
  title_en text not null,
  duration_sec integer not null default 0 check (duration_sec >= 0),
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create table public.lesson_media (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  stream_video_uid text,
  transcript_ko text,
  transcript_en text,
  -- 레슨 자료 (R2 키 목록)
  attachment_r2_keys text[] not null default '{}'
);

-- ───────────────────────────────────────────────────────────
-- 5. 전자책 · 라이브
-- ───────────────────────────────────────────────────────────
create table public.ebook_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  r2_key text not null,
  format public.ebook_format not null default 'pdf',
  version integer not null default 1,
  page_count integer,
  created_at timestamptz not null default now(),
  unique (product_id, format, version)
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  starts_at timestamptz not null,
  duration_min integer not null default 60,
  capacity integer check (capacity > 0),
  zoom_meeting_id text,
  recording_product_id uuid references public.products (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 회원별 Zoom 개인 링크. 서버가 Zoom 등록 후 채운다.
create table public.live_registrations (
  live_session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  join_url text,
  registered_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (live_session_id, user_id)
);

-- ───────────────────────────────────────────────────────────
-- 6. 쿠폰 · 주문 · 권한
-- ───────────────────────────────────────────────────────────
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  -- percent_off 또는 amount_off 중 하나만 쓴다 (amount_off는 currency의 최소 단위)
  percent_off integer check (percent_off between 1 and 100),
  amount_off integer check (amount_off > 0),
  currency public.currency_code,
  product_id uuid references public.products (id) on delete cascade,
  valid_until timestamptz,
  usage_limit integer check (usage_limit > 0),
  used_count integer not null default 0,
  created_at timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off is null)),
  check (amount_off is null or currency is not null)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  provider public.payment_provider not null,
  -- PortOne paymentId / Lemon Squeezy order id. 결제창을 열기 전에는 비어 있을 수 있다.
  provider_order_id text,
  pay_method text,
  currency public.currency_code not null,
  amount integer not null check (amount >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  status public.order_status not null default 'pending',
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id)
);

create index orders_user_id_idx on public.orders (user_id, created_at desc);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- 접근 권한의 단일 기준
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  -- 관리자가 직접 준 권한은 null
  source_order_id uuid references public.orders (id) on delete restrict,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, product_id, source_order_id)
);

create index entitlements_user_product_idx on public.entitlements (user_id, product_id);

-- 유효한 접근 권한이 있는지 (만료 · 취소 제외). 강의 · 전자책 · 과제 RLS의 기준.
create function public.has_entitlement(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.user_id = (select auth.uid())
      and e.product_id = p_product_id
      and e.revoked_at is null
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- ───────────────────────────────────────────────────────────
-- 7. 학습 · 과제
-- ───────────────────────────────────────────────────────────
create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position_sec integer not null default 0 check (position_sec >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create trigger lesson_progress_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- notice · blog: 전체 공개 (published_at이 지난 글)
-- assignment: 운영자가 내는 과제. 해당 상품(product_id) 수강생만 본다.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  board public.post_board not null,
  author_id uuid references auth.users (id) on delete set null,
  product_id uuid references public.products (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  slug text,
  locale text not null default 'ko' check (locale in ('ko', 'en')),
  title text not null,
  body text not null default '',
  due_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board, locale, slug),
  check (board <> 'assignment' or product_id is not null)
);

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(body) > 0),
  file_r2_key text,
  status public.submission_status not null default 'submitted',
  feedback text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submissions_user_idx on public.submissions (user_id, created_at desc);

create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

-- 수강생은 본문 · 첨부만 고칠 수 있다. 상태 · 피드백은 운영자만.
create function public.guard_submission_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.feedback is distinct from old.feedback
     or new.reviewed_at is distinct from old.reviewed_at
     or new.user_id is distinct from old.user_id
     or new.post_id is distinct from old.post_id then
    raise exception 'only an admin can review a submission';
  end if;
  return new;
end;
$$;

create trigger submissions_guard_review before update on public.submissions
  for each row execute function public.guard_submission_review();

-- ───────────────────────────────────────────────────────────
-- 8. 배지 · 리드
-- ───────────────────────────────────────────────────────────
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ko text not null,
  name_en text not null,
  image_url text,
  rule text
);

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- 무료 미니 강의 신청 (홈 리드 폼). 서버만 쓴다.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null default 'ko',
  source text not null default 'home',
  created_at timestamptz not null default now(),
  unique (email, source)
);

-- ───────────────────────────────────────────────────────────
-- 9. 가입하면 프로필 + 가입 배지
-- ───────────────────────────────────────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'ko' end
  )
  on conflict (id) do nothing;

  insert into public.user_badges (user_id, badge_id)
  select new.id, b.id from public.badges b where b.code = 'signup'
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────
-- 10. 결제 확정 → 권한 부여 (PLAN 5-1의 grantEntitlements)
--     서버(웹훅 · 복귀 확인)만 부른다. 금액 · 통화 · 회원 검증은 서버가 먼저 한다.
--     같은 주문으로 여러 번 불러도 결과는 같다.
-- ───────────────────────────────────────────────────────────
create function public.grant_entitlements(p_order_id uuid)
returns setof public.entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_paid_at timestamptz;
begin
  -- 동시에 도착한 웹훅 · 복귀 확인이 순서대로 처리되도록 주문 행을 잠근다.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id;
  end if;
  if v_order.status in ('failed', 'refunded') then
    raise exception 'order % is %', p_order_id, v_order.status;
  end if;

  v_paid_at := coalesce(v_order.paid_at, now());

  update public.orders
     set status = 'paid', paid_at = v_paid_at
   where id = p_order_id and status <> 'paid';

  -- 번들이면 구성 상품마다 1행, 아니면 그 상품 1행
  insert into public.entitlements (user_id, product_id, source_order_id, expires_at)
  select v_order.user_id,
         p.id,
         v_order.id,
         case when p.access_days is null then null
              else v_paid_at + make_interval(days => p.access_days) end
    from public.products p
   where p.id in (
           select bi.product_id from public.bundle_items bi where bi.bundle_id = v_order.product_id
           union
           select v_order.product_id
         )
     and p.type <> 'bundle'
  on conflict (user_id, product_id, source_order_id) do nothing;

  insert into public.user_badges (user_id, badge_id)
  select v_order.user_id, b.id from public.badges b where b.code = 'first-purchase'
  on conflict do nothing;

  return query
    select * from public.entitlements e where e.source_order_id = p_order_id;
end;
$$;

-- 환불 · 취소 · 차지백: 주문을 refunded로, 그 주문으로 받은 권한을 취소
create function public.revoke_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
     set status = 'refunded', refunded_at = coalesce(refunded_at, now())
   where id = p_order_id;
  if not found then
    raise exception 'order % not found', p_order_id;
  end if;

  update public.entitlements
     set revoked_at = now()
   where source_order_id = p_order_id and revoked_at is null;
end;
$$;

-- 이 두 함수는 서버(service_role)만 실행할 수 있다.
revoke execute on function public.grant_entitlements(uuid) from public, anon, authenticated;
revoke execute on function public.revoke_order(uuid) from public, anon, authenticated;
grant execute on function public.grant_entitlements(uuid) to service_role;
grant execute on function public.revoke_order(uuid) to service_role;

-- 트리거 전용 함수는 직접 부를 수 없게 한다.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────
-- 11. RLS
--     정책이 없는 동작은 전부 거부된다. 서버(secret key)는 RLS를 건너뛴다.
-- ───────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.bundle_items enable row level security;
alter table public.course_sections enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_media enable row level security;
alter table public.ebook_files enable row level security;
alter table public.live_sessions enable row level security;
alter table public.live_registrations enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.posts enable row level security;
alter table public.submissions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.leads enable row level security;

-- 프로필: 본인만 읽고 고친다
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- 상품 · 커리큘럼 · 일정: 공개된 것만 누구나 읽는다
create policy "products: read published" on public.products
  for select to anon, authenticated using (status = 'published' or (select public.is_admin()));
create policy "bundle_items: read" on public.bundle_items
  for select to anon, authenticated using (true);
create policy "course_sections: read" on public.course_sections
  for select to anon, authenticated using (true);
create policy "lessons: read" on public.lessons
  for select to anon, authenticated using (true);
create policy "live_sessions: read" on public.live_sessions
  for select to anon, authenticated using (true);
create policy "badges: read" on public.badges
  for select to anon, authenticated using (true);

-- 영상 · 스크립트: 미리보기 레슨이거나 권한이 있을 때만
create policy "lesson_media: preview or entitled" on public.lesson_media
  for select to anon, authenticated using (
    exists (
      select 1 from public.lessons l
       where l.id = lesson_media.lesson_id
         and (l.is_preview or public.has_entitlement(l.product_id) or public.is_admin())
    )
  );

-- 전자책 파일 정보: 권한이 있을 때만 (다운로드 자체는 서버가 서명 URL로)
create policy "ebook_files: entitled" on public.ebook_files
  for select to authenticated using (public.has_entitlement(product_id) or (select public.is_admin()));

-- 라이브 개인 링크: 본인 것만
create policy "live_registrations: read own" on public.live_registrations
  for select to authenticated using (user_id = (select auth.uid()));

-- 주문 · 권한 · 배지: 본인 것만 읽는다 (쓰기는 서버만)
create policy "orders: read own" on public.orders
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "entitlements: read own" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "user_badges: read own" on public.user_badges
  for select to authenticated using (user_id = (select auth.uid()));

-- 진도: 본인 것, 그리고 그 강의 권한이 있을 때만 기록
create policy "lesson_progress: read own" on public.lesson_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "lesson_progress: insert own entitled" on public.lesson_progress
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.lessons l where l.id = lesson_id and public.has_entitlement(l.product_id))
  );
create policy "lesson_progress: update own entitled" on public.lesson_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.lessons l where l.id = lesson_id and public.has_entitlement(l.product_id))
  );

-- 게시글: 공지 · 블로그는 공개 후 누구나, 과제는 수강생만. 작성은 운영자만.
create policy "posts: read" on public.posts
  for select to anon, authenticated using (
    (select public.is_admin())
    or (
      published_at is not null and published_at <= now()
      and (board <> 'assignment' or public.has_entitlement(product_id))
    )
  );
create policy "posts: admin write" on public.posts
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- 과제 제출물: 작성자 본인과 운영자만
create policy "submissions: read own" on public.submissions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "submissions: insert own entitled" on public.submissions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and status = 'submitted'
    and feedback is null
    and exists (
      select 1 from public.posts p
       where p.id = post_id and p.board = 'assignment' and public.has_entitlement(p.product_id)
    )
  );
create policy "submissions: update own or admin" on public.submissions
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

-- coupons · leads: 정책 없음 = 서버만 접근
