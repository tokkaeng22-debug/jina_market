"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { btnPrimary, fieldError, input } from "@/components/ui/styles";

/** 리드 마그넷 신청 (더미). 실제로는 Resend 오디언스에 저장한다 */
export function LeadForm() {
  const t = useTranslations("Home");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setState(/^\S+@\S+\.\S+$/.test(email.trim()) ? "done" : "error");
      }}
      className="flex flex-wrap gap-2"
    >
      <label htmlFor="lead-email" className="sr-only">
        {t("leadPlaceholder")}
      </label>
      <input
        id="lead-email"
        type="email"
        autoComplete="email"
        placeholder={t("leadPlaceholder")}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setState("idle");
        }}
        className={`${input} min-w-0 flex-1 basis-56`}
      />
      <button type="submit" className={`${btnPrimary} grow sm:grow-0`}>
        {t("leadSubmit")}
      </button>
      <p role="status" className={`min-h-5 basis-full ${state === "error" ? fieldError : "text-sm font-bold text-sky-700"}`}>
        {state === "error" ? t("leadInvalid") : state === "done" ? t("leadDone") : ""}
      </p>
    </form>
  );
}
