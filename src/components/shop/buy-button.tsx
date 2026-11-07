"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ownedHref, type ProductType } from "@/lib/catalog/types";
import { useOwned } from "@/lib/account/use-owned";
import { btnPrimary } from "@/components/ui/styles";

/** 상품 상세의 주 버튼. 이미 권한이 있으면 "이어서 학습하기"로 바뀐다 (PLAN.md 5-1) */
export function BuyButton({ slug, type, price }: { slug: string; type: ProductType; price: string }) {
  const t = useTranslations("Shop");
  const { owned } = useOwned();
  const has = owned.includes(slug);
  const label = has ? (type === "course" ? t("continue") : type === "ebook" ? t("download") : t("joinInfo")) : `${t("buy")} · ${price}`;

  return (
    <Link href={has ? ownedHref(slug, type) : `/checkout/${slug}`} className={`${btnPrimary} w-full sm:w-auto`}>
      {label}
    </Link>
  );
}
