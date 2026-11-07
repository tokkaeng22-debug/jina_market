import "server-only";
import { GetPaymentError, PaymentClient, type Payment } from "@portone/server-sdk/payment";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * PortOne 결제 상태를 우리 DB 주문에 반영한다 (PLAN.md 5-1).
 * 결제창 복귀 · 웹훅이 모두 이 함수를 부르고, 판단 근거는 항상 PortOne API로 다시 조회한 결제 정보다.
 * 여러 번 불러도 결과가 같다 (grant_entitlements는 주문을 잠그고 중복 권한을 만들지 않는다).
 */
export type VirtualAccountInfo = {
  bank: string | null;
  accountNumber: string;
  holder: string | null;
  expiresAt: string | null;
  amount: number;
};

export type SyncResult = {
  status: "pending" | "awaiting_deposit" | "paid" | "failed" | "refunded";
  userId: string;
  slug: string;
  virtualAccount?: VirtualAccountInfo;
};

type OrderRow = {
  id: string;
  user_id: string;
  status: SyncResult["status"];
  amount: number;
  currency: "KRW" | "USD";
  products: { slug: string } | null;
};

function portone() {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error("PORTONE_API_SECRET이 없습니다.");
  return PaymentClient({ secret });
}

async function fetchPayment(paymentId: string): Promise<Payment | null> {
  try {
    return await portone().getPayment({ paymentId });
  } catch (err) {
    // 결제창을 열기 전에 닫으면 PortOne에 결제 건이 아예 없다
    if (err instanceof GetPaymentError && err.data.type === "PAYMENT_NOT_FOUND") return null;
    throw err;
  }
}

/**
 * @param closing 결제창이 실패 · 취소로 닫혔을 때 true. 아직 결제되지 않은 주문을 실패로 닫는다.
 */
export async function syncPayment(paymentId: string, { closing = false } = {}): Promise<SyncResult | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("orders")
    .select("id, user_id, status, amount, currency, products(slug)")
    .eq("provider", "portone")
    .eq("provider_order_id", paymentId)
    .maybeSingle();
  if (error) throw new Error(`orders: ${error.message}`);
  if (!data) return null;
  const order = data as unknown as OrderRow;
  const base = { userId: order.user_id, slug: order.products?.slug ?? "" };

  const setStatus = async (status: "awaiting_deposit" | "failed") => {
    const { error: err } = await db.from("orders").update({ status }).eq("id", order.id).in("status", ["pending", "awaiting_deposit"]);
    if (err) throw new Error(`orders: ${err.message}`);
  };

  const payment = await fetchPayment(paymentId);
  if (!payment || payment.status === "READY" || payment.status === "PAY_PENDING") {
    if (closing && order.status === "pending") {
      await setStatus("failed");
      return { ...base, status: "failed" };
    }
    return { ...base, status: order.status };
  }

  // 금액 · 통화가 주문과 다르면 위변조로 보고 권한을 주지 않는다
  const matches =
    "amount" in payment && payment.amount.total === order.amount && "currency" in payment && payment.currency === order.currency;

  switch (payment.status) {
    case "PAID": {
      if (!matches) {
        console.error(`[portone] amount mismatch for ${paymentId}`);
        await setStatus("failed");
        return { ...base, status: "failed" };
      }
      const { error: err } = await db.rpc("grant_entitlements", { p_order_id: order.id });
      if (err) throw new Error(`grant_entitlements: ${err.message}`);
      return { ...base, status: "paid" };
    }
    case "VIRTUAL_ACCOUNT_ISSUED": {
      if (!matches) {
        console.error(`[portone] amount mismatch for ${paymentId}`);
        await setStatus("failed");
        return { ...base, status: "failed" };
      }
      await setStatus("awaiting_deposit");
      const method = payment.method;
      const va = method?.type === "PaymentMethodVirtualAccount" ? method : null;
      return {
        ...base,
        status: "awaiting_deposit",
        virtualAccount: va
          ? {
              bank: va.bank ?? null,
              accountNumber: va.accountNumber,
              holder: va.remitteeName ?? null,
              expiresAt: va.expiredAt ?? null,
              amount: order.amount,
            }
          : undefined,
      };
    }
    case "CANCELLED": {
      if (order.status === "paid" || order.status === "refunded") {
        const { error: err } = await db.rpc("revoke_order", { p_order_id: order.id });
        if (err) throw new Error(`revoke_order: ${err.message}`);
        return { ...base, status: "refunded" };
      }
      await setStatus("failed");
      return { ...base, status: "failed" };
    }
    case "FAILED":
      await setStatus("failed");
      return { ...base, status: "failed" };
    default:
      // 부분 취소 등은 관리자 화면에서 직접 처리한다
      return { ...base, status: order.status };
  }
}
