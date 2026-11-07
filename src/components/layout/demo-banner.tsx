"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { demo } from "@/lib/demo/store";
import { signOut } from "@/lib/auth/use-auth";

/** 더미 UI 기간에만 쓰는 안내 띠. 실제 결제를 연결하면 레이아웃에서 뺀다 */
export function DemoBanner() {
  const t = useTranslations("Demo");
  const router = useRouter();
  return (
    <div className="bg-cheer text-sm text-[#1f2329]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
        <p className="font-bold">{t("banner")}</p>
        <button
          type="button"
          onClick={async () => {
            demo.reset();
            await signOut();
            router.push("/");
          }}
          className="shrink-0 rounded-full border border-[#1f2329]/30 px-3 py-1 font-bold hover:bg-white/40"
        >
          {t("reset")}
        </button>
      </div>
    </div>
  );
}
