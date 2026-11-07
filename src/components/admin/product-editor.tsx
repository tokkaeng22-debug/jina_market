"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProduct, type ProductInput } from "@/lib/admin/actions";
import type { AdminProduct, ProductStatus } from "@/lib/admin/server";
import { btnPrimary, fieldError, input } from "@/components/ui/styles";

const statuses: ProductStatus[] = ["published", "draft", "archived"];

/** 상품 한 개의 수정 폼 (이름 · 소개 · 가격 · 공개 상태) */
export function ProductEditor({ product }: { product: AdminProduct }) {
  const t = useTranslations("Admin");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    titleKo: product.titleKo,
    titleEn: product.titleEn,
    summaryKo: product.summaryKo,
    summaryEn: product.summaryEn,
    metaKo: product.metaKo,
    metaEn: product.metaEn,
    priceKrw: String(product.priceKrw),
    priceUsd: (product.priceUsdCents / 100).toFixed(2),
    status: product.status,
  });
  const id = (name: string) => `${product.id}-${name}`;
  const change = (name: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setMessage(null);
  };

  function save(e: React.FormEvent) {
    e.preventDefault();
    const priceKrw = Number(form.priceKrw.replace(/[,\s]/g, ""));
    const usd = Number(form.priceUsd.replace(/[$,\s]/g, ""));
    if (!form.titleKo.trim() || !form.titleEn.trim()) return setMessage({ ok: false, text: t("titleRequired") });
    if (!Number.isInteger(priceKrw) || priceKrw < 0 || !Number.isFinite(usd) || usd < 0) {
      return setMessage({ ok: false, text: t("priceInvalid") });
    }
    const payload: ProductInput = {
      titleKo: form.titleKo,
      titleEn: form.titleEn,
      summaryKo: form.summaryKo,
      summaryEn: form.summaryEn,
      metaKo: form.metaKo,
      metaEn: form.metaEn,
      priceKrw,
      priceUsdCents: Math.round(usd * 100),
      status: form.status,
    };
    start(async () => {
      try {
        const r = await updateProduct(product.id, payload);
        setMessage(r.ok ? { ok: true, text: t("saved") } : { ok: false, text: t(`error.${r.reason}`) });
      } catch {
        setMessage({ ok: false, text: t("error.error") });
      }
    });
  }

  const field = (name: "titleKo" | "titleEn" | "metaKo" | "metaEn", label: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id(name)} className="text-sm font-bold">
        {label}
      </label>
      <input id={id(name)} value={form[name]} onChange={change(name)} className={input} />
    </div>
  );
  const area = (name: "summaryKo" | "summaryEn", label: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id(name)} className="text-sm font-bold">
        {label}
      </label>
      <textarea id={id(name)} value={form[name]} onChange={change(name)} rows={3} className={`${input} py-3`} />
    </div>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("titleKo", t("titleKo"))}
        {field("titleEn", t("titleEn"))}
        {area("summaryKo", t("summaryKo"))}
        {area("summaryEn", t("summaryEn"))}
        {field("metaKo", t("metaKo"))}
        {field("metaEn", t("metaEn"))}
        <div className="flex flex-col gap-1">
          <label htmlFor={id("priceKrw")} className="text-sm font-bold">
            {t("priceKrw")}
          </label>
          <input id={id("priceKrw")} inputMode="numeric" value={form.priceKrw} onChange={change("priceKrw")} className={input} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={id("priceUsd")} className="text-sm font-bold">
            {t("priceUsd")}
          </label>
          <input id={id("priceUsd")} inputMode="decimal" value={form.priceUsd} onChange={change("priceUsd")} className={input} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={id("status")} className="text-sm font-bold">
            {t("visibility")}
          </label>
          <select id={id("status")} value={form.status} onChange={change("status")} className={input}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {t(`productStatus.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted">{t("priceNote")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? t("working") : t("save")}
        </button>
        <span role="status" className={message && !message.ok ? fieldError : "text-sm font-bold text-emerald-700 dark:text-emerald-300"}>
          {message?.text}
        </span>
      </div>
    </form>
  );
}
