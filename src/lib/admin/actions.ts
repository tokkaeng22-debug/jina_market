"use server";

import { refresh, updateTag } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncPayment } from "@/lib/payments/portone";
import { getAdminUser, PRODUCT_STATUSES, type ProductStatus } from "./server";

/**
 * 관리자 동작. 모든 동작은 먼저 관리자인지 서버에서 다시 확인한다 (화면을 숨기는 것만으로는 막을 수 없다).
 */
export type AdminResult = { ok: true; status?: string } | { ok: false; reason: "forbidden" | "notFound" | "invalid" | "error" };

/** PortOne에 결제 상태를 다시 물어 주문에 반영한다 (웹훅을 놓쳤을 때) */
export async function recheckOrder(orderId: string): Promise<AdminResult> {
  if (!(await getAdminUser())) return { ok: false, reason: "forbidden" };
  const db = createSupabaseAdminClient();
  const { data: order } = await db.from("orders").select("provider, provider_order_id").eq("id", orderId).maybeSingle();
  if (!order?.provider_order_id || order.provider !== "portone") return { ok: false, reason: "notFound" };
  try {
    await syncPayment(order.provider_order_id);
    // 결과는 PortOne 상태가 아니라 반영된 뒤의 우리 주문 상태로 보여 준다 (수동 처리한 주문은 PortOne에선 입금 대기일 수 있다)
    const { data: after } = await db.from("orders").select("status").eq("id", orderId).maybeSingle();
    refresh();
    return { ok: true, status: after?.status };
  } catch (err) {
    console.error("[admin] recheck failed", err);
    return { ok: false, reason: "error" };
  }
}

/**
 * 입금을 직접 확인했을 때 주문을 결제 완료로 바꾸고 권한을 준다.
 * 결제 완료 처리와 같은 grant_entitlements를 쓴다. 대기 중인 주문만 바꿀 수 있다.
 */
export async function markOrderPaid(orderId: string): Promise<AdminResult> {
  if (!(await getAdminUser())) return { ok: false, reason: "forbidden" };
  const db = createSupabaseAdminClient();
  const { data: order } = await db.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, reason: "notFound" };
  if (order.status !== "pending" && order.status !== "awaiting_deposit") return { ok: false, reason: "invalid" };
  const { error } = await db.rpc("grant_entitlements", { p_order_id: orderId });
  if (error) {
    console.error("[admin] grant failed", error.message);
    return { ok: false, reason: "error" };
  }
  refresh();
  return { ok: true, status: "paid" };
}

export type ProductInput = {
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  metaKo: string;
  metaEn: string;
  priceKrw: number;
  priceUsdCents: number;
  status: ProductStatus;
};

/** 상품 이름 · 소개 · 가격 · 공개 상태를 고친다. 이미 결제된 주문의 금액은 바뀌지 않는다 */
export async function updateProduct(productId: string, input: ProductInput): Promise<AdminResult> {
  if (!(await getAdminUser())) return { ok: false, reason: "forbidden" };
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const titleKo = text(input.titleKo);
  const titleEn = text(input.titleEn);
  const priceOk = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 100_000_000;
  if (!titleKo || !titleEn || !priceOk(input.priceKrw) || !priceOk(input.priceUsdCents) || !PRODUCT_STATUSES.includes(input.status)) {
    return { ok: false, reason: "invalid" };
  }

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("products")
    .update({
      title_ko: titleKo,
      title_en: titleEn,
      summary_ko: text(input.summaryKo) || null,
      summary_en: text(input.summaryEn) || null,
      meta_ko: text(input.metaKo) || null,
      meta_en: text(input.metaEn) || null,
      price_krw: input.priceKrw,
      price_usd_cents: input.priceUsdCents,
      status: input.status,
    })
    .eq("id", productId)
    .select("id");
  if (error) {
    console.error("[admin] product update failed", error.message);
    return { ok: false, reason: "error" };
  }
  if (!data?.length) return { ok: false, reason: "notFound" };
  // 공개 페이지 · 결제 금액이 바로 새 값을 쓰도록 카탈로그 캐시를 비운다
  updateTag("catalog");
  refresh();
  return { ok: true };
}
