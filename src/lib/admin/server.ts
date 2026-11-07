import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProductType } from "@/lib/catalog/types";

/**
 * 관리자 화면 · 관리자 동작이 공통으로 쓰는 확인과 조회.
 * 관리자 여부는 profiles.is_admin 하나로만 판단한다 (회원이 스스로 켤 수 없다: guard_profile_admin 트리거).
 */
export async function getAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return profile?.is_admin ? user : null;
}

export type OrderStatus = "pending" | "awaiting_deposit" | "paid" | "failed" | "refunded";
export const ORDER_STATUSES: OrderStatus[] = ["awaiting_deposit", "pending", "paid", "refunded", "failed"];

export type AdminOrder = {
  id: string;
  provider: "portone" | "lemonsqueezy" | "manual";
  paymentId: string | null;
  payMethod: string | null;
  status: OrderStatus;
  amount: number;
  currency: "KRW" | "USD";
  createdAt: string;
  paidAt: string | null;
  email: string;
  product: { slug: string; title: string } | null;
};

type OrderRow = {
  id: string;
  user_id: string;
  provider: AdminOrder["provider"];
  provider_order_id: string | null;
  pay_method: string | null;
  status: OrderStatus;
  amount: number;
  currency: "KRW" | "USD";
  created_at: string;
  paid_at: string | null;
  products: { slug: string; title_ko: string; title_en: string } | null;
};

/** 최근 주문 100건. 회원 이메일은 auth.users에 있어 관리자 키로 따로 읽는다 */
export async function listOrders(status: OrderStatus | null, locale: "ko" | "en"): Promise<AdminOrder[]> {
  const db = createSupabaseAdminClient();
  let query = db
    .from("orders")
    .select("id, user_id, provider, provider_order_id, pay_method, status, amount, currency, created_at, paid_at, products(slug, title_ko, title_en)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const [{ data, error }, users] = await Promise.all([query, db.auth.admin.listUsers({ perPage: 1000 })]);
  if (error) throw new Error(`orders: ${error.message}`);
  const emails = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (data as unknown as OrderRow[]).map((o) => ({
    id: o.id,
    provider: o.provider,
    paymentId: o.provider_order_id,
    payMethod: o.pay_method,
    status: o.status,
    amount: o.amount,
    currency: o.currency,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    email: emails.get(o.user_id) || o.user_id.slice(0, 8),
    product: o.products ? { slug: o.products.slug, title: locale === "ko" ? o.products.title_ko : o.products.title_en } : null,
  }));
}

export type ProductStatus = "draft" | "published" | "archived";
export const PRODUCT_STATUSES: ProductStatus[] = ["published", "draft", "archived"];

export type AdminProduct = {
  id: string;
  slug: string;
  type: ProductType;
  status: ProductStatus;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  metaKo: string;
  metaEn: string;
  priceKrw: number;
  priceUsdCents: number;
};

/** 게시 전 · 보관 상품까지 전부 (공개 카탈로그는 게시된 것만 보인다) */
export async function listAllProducts(): Promise<AdminProduct[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("products")
    .select("id, slug, type, status, title_ko, title_en, summary_ko, summary_en, meta_ko, meta_en, price_krw, price_usd_cents")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`products: ${error.message}`);
  return data.map((p) => ({
    id: p.id as string,
    slug: p.slug as string,
    type: p.type as ProductType,
    status: p.status as ProductStatus,
    titleKo: p.title_ko as string,
    titleEn: p.title_en as string,
    summaryKo: (p.summary_ko as string | null) ?? "",
    summaryEn: (p.summary_en as string | null) ?? "",
    metaKo: (p.meta_ko as string | null) ?? "",
    metaEn: (p.meta_en as string | null) ?? "",
    priceKrw: p.price_krw as number,
    priceUsdCents: p.price_usd_cents as number,
  }));
}
