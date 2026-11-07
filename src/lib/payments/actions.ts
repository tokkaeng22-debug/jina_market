"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProduct } from "@/lib/catalog/server";
import { syncPayment, type SyncResult } from "./portone";

/**
 * 결제 흐름 (PLAN.md 5-1)
 * 1. startCheckout: 서버가 DB 가격으로 주문(pending)을 만들고 paymentId를 돌려준다. 금액은 절대 브라우저 값을 믿지 않는다.
 * 2. 브라우저가 PortOne 결제창을 연다.
 * 3. confirmPayment: 결제창에서 돌아오면 서버가 PortOne API로 다시 조회해 권한을 준다. 웹훅도 같은 syncPayment를 부른다.
 */
export type PayMethod = "card" | "easyPay" | "vbank";

export type StartResult =
  | { ok: true; paymentId: string; orderName: string; amount: number; email: string }
  | { ok: false; reason: "login" | "notFound" | "owned" | "error" };

async function currentUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function startCheckout(slug: string, method: PayMethod): Promise<StartResult> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "login" };
  const product = await getProduct(slug);
  if (!product || product.type === "bundle") return { ok: false, reason: "notFound" };

  const db = createSupabaseAdminClient();
  const { data: owned } = await db
    .from("entitlements")
    .select("id, expires_at")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .is("revoked_at", null);
  if (owned?.some((e) => !e.expires_at || Date.parse(e.expires_at) > Date.now())) return { ok: false, reason: "owned" };

  const paymentId = `mg-${crypto.randomUUID()}`;
  const { error } = await db.from("orders").insert({
    user_id: user.id,
    product_id: product.id,
    provider: "portone",
    provider_order_id: paymentId,
    pay_method: method,
    currency: "KRW",
    amount: product.priceKrw,
  });
  if (error) {
    console.error("[checkout] order insert failed", error.message);
    return { ok: false, reason: "error" };
  }
  return { ok: true, paymentId, orderName: product.title.ko, amount: product.priceKrw, email: user.email ?? "" };
}

export type ConfirmResult = Omit<SyncResult, "userId"> | { status: "notFound" };

/** 본인 주문만 확인할 수 있다. closing은 결제창이 실패 · 취소로 닫혔을 때 */
export async function confirmPayment(paymentId: string, closing = false): Promise<ConfirmResult> {
  const user = await currentUser();
  if (!user) return { status: "notFound" };
  const result = await syncPayment(paymentId, { closing });
  if (!result || result.userId !== user.id) return { status: "notFound" };
  const { userId: _ignored, ...rest } = result;
  void _ignored;
  return rest;
}
