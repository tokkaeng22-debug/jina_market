import { Webhook } from "@portone/server-sdk";
import { syncPayment } from "@/lib/payments/portone";

/**
 * PortOne 웹훅 (가상계좌 입금, 결제창을 닫은 뒤 늦게 끝난 결제, 취소).
 * 웹훅 본문은 "이 결제를 다시 확인해 달라"는 신호로만 쓰고, 결제 상태는 syncPayment가 PortOne API로 다시 조회해 판단한다.
 * PORTONE_WEBHOOK_SECRET이 있으면 서명도 검증한다 (콘솔의 웹훅 시크릿).
 */
export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.PORTONE_WEBHOOK_SECRET;

  let paymentId: string | undefined;
  try {
    const hook = secret
      ? await Webhook.verify(secret, body, Object.fromEntries(request.headers))
      : (JSON.parse(body) as { data?: { paymentId?: string } });
    const data = "data" in hook ? (hook.data as { paymentId?: string } | undefined) : undefined;
    paymentId = data?.paymentId;
  } catch (err) {
    console.error("[portone webhook] rejected", err);
    return new Response("invalid webhook", { status: 400 });
  }

  if (!paymentId) return new Response("ok");
  try {
    await syncPayment(paymentId);
  } catch (err) {
    // 5xx를 돌려주면 PortOne이 다시 보낸다
    console.error("[portone webhook] sync failed", err);
    return new Response("sync failed", { status: 500 });
  }
  return new Response("ok");
}
