"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDemo, useHydrated } from "@/lib/demo/store";
import { LoginSheet } from "@/components/auth/login-sheet";

const pill = "rounded-full px-3 py-2 text-base font-bold hover:bg-white/15";

export function HeaderAccount() {
  const t = useTranslations("Nav");
  const { user } = useDemo();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);

  if (hydrated && user) {
    return (
      <Link href="/account" className={pill}>
        {t("account")}
      </Link>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={pill}>
        {t("login")}
      </button>
      <LoginSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
