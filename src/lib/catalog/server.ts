import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import type { Badge, Product, ProductType } from "./types";

/**
 * 공개 카탈로그 (게시된 상품 · 강의 목록 · 배지).
 * 누구에게나 같은 데이터라 쿠키 없는 공개 키로 읽고 캐시한다 (RLS: products는 published만 보인다).
 * Supabase에서 값을 고치면 1분 안팎으로 사이트에 반영된다 (cacheLife "minutes").
 */
function publicClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createClient(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type ProductRow = {
  id: string;
  slug: string;
  type: ProductType;
  title_ko: string;
  title_en: string;
  summary_ko: string | null;
  summary_en: string | null;
  meta_ko: string | null;
  meta_en: string | null;
  price_krw: number;
  price_usd_cents: number;
  lessons: { id: string; position: number; title_ko: string; title_en: string; duration_sec: number; is_preview: boolean }[];
};

const PRODUCT_COLUMNS =
  "id, slug, type, title_ko, title_en, summary_ko, summary_en, meta_ko, meta_en, price_krw, price_usd_cents, lessons(id, position, title_ko, title_en, duration_sec, is_preview)";

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: { ko: row.title_ko, en: row.title_en },
    summary: { ko: row.summary_ko ?? "", en: row.summary_en ?? "" },
    meta: { ko: row.meta_ko ?? "", en: row.meta_en ?? "" },
    priceKrw: row.price_krw,
    priceUsdCents: row.price_usd_cents,
    lessons: [...row.lessons]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        id: l.id,
        title: { ko: l.title_ko, en: l.title_en },
        minutes: Math.round(l.duration_sec / 60),
        preview: l.is_preview,
      })),
  };
}

/** 게시된 상품 전체. 최신 상품이 앞에 온다 */
export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const db = publicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("type");
  if (error) throw new Error(`products: ${error.message}`);
  return (data as unknown as ProductRow[]).map(toProduct);
}

export async function getProduct(slug: string) {
  return (await getProducts()).find((p) => p.slug === slug);
}

export async function getBadges(): Promise<Badge[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const db = publicClient();
  if (!db) return [];
  const { data, error } = await db.from("badges").select("code, name_ko, name_en");
  if (error) throw new Error(`badges: ${error.message}`);
  return data.map((b) => ({ code: b.code as string, name: { ko: b.name_ko as string, en: b.name_en as string } }));
}

/**
 * Cache Components에서는 generateStaticParams가 1개 이상을 돌려줘야 한다.
 * DB가 비어 있거나 연결 전이면 없는 slug 하나를 넣어 빌드만 통과시킨다 (그 페이지는 404).
 */
export async function productSlugParams(filter?: (p: Product) => boolean) {
  const slugs = (await getProducts()).filter(filter ?? (() => true)).map((p) => ({ slug: p.slug }));
  return slugs.length ? slugs : [{ slug: "_" }];
}
