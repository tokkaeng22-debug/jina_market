"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { markOrderPaid, recheckOrder, type AdminResult } from "@/lib/admin/actions";
import { btnSecondary } from "@/components/ui/styles";

const small = `${btnSecondary} min-h-10 px-3 text-sm`;

/** 주문 한 건의 버튼: PortOne 다시 확인 · 입금 확인 처리 */
export function OrderActions({
  orderId,
  label,
  canRecheck,
  canMarkPaid,
}: {
  orderId: string;
  label: string;
  canRecheck: boolean;
  canMarkPaid: boolean;
}) {
  const t = useTranslations("Admin");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");

  function run(action: () => Promise<AdminResult>) {
    setMessage("");
    start(async () => {
      try {
        const r = await action();
        setMessage(r.ok ? (r.status ? t("resultStatus", { status: t(`status.${r.status}`) }) : t("done")) : t(`error.${r.reason}`));
      } catch {
        setMessage(t("error.error"));
      }
    });
  }

  if (!canRecheck && !canMarkPaid) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRecheck && (
        <button type="button" className={small} disabled={pending} onClick={() => run(() => recheckOrder(orderId))}>
          {t("recheck")}
        </button>
      )}
      {canMarkPaid && (
        <button
          type="button"
          className={small}
          disabled={pending}
          onClick={() => {
            if (window.confirm(t("markPaidConfirm", { order: label }))) run(() => markOrderPaid(orderId));
          }}
        >
          {t("markPaid")}
        </button>
      )}
      <span role="status" className="text-sm text-muted">
        {pending ? t("working") : message}
      </span>
    </div>
  );
}
