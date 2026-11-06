"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { demo, type LoginVia } from "@/lib/demo/store";
import { fieldError, input } from "@/components/ui/styles";

/**
 * 결제 화면 위에 뜨는 로그인 창 (PLAN.md 5-1: 페이지 이동 없이 로그인).
 * 간편 로그인(카카오 · Google)을 위에, 이메일을 아래에 둔다.
 * 지금은 더미: Supabase Auth 연결 시 signInWithOAuth / signInWithPassword로 바꾼다.
 */
export function LoginSheet({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function finish(name: string, via: LoginVia) {
    demo.login(name, via);
    setPassword("");
    onSuccess?.();
    onClose();
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t("invalidEmail"));
    if (password.length < 8) return setError(t("shortPassword"));
    finish(email.trim().split("@")[0], "email");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-sheet-title"
        className="flex w-full max-w-md flex-col gap-3 rounded-t-3xl bg-background p-5 pb-8 sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="login-sheet-title" className="text-xl font-extrabold">
              {t("sheetTitle")}
            </h2>
            <p className="mt-1 text-muted">{t("sheetBody")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="grid size-10 place-items-center rounded-full text-2xl hover:bg-mist">
            ×
          </button>
        </div>

        <button
          ref={firstButton}
          type="button"
          onClick={() => finish(t("kakaoName"), "kakao")}
          className="min-h-12 rounded-xl bg-[#FEE500] font-bold text-[#191919] hover:brightness-95"
        >
          {t("kakao")}
        </button>
        <button type="button" onClick={() => finish(t("googleName"), "google")} className="min-h-12 rounded-xl border border-line bg-white font-bold text-[#1f1f1f] hover:bg-gray-50">
          {t("google")}
        </button>

        <div className="my-1 flex items-center gap-3 text-sm text-muted">
          <span className="h-px flex-1 bg-line" />
          {t("or")}
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submitEmail} className="flex flex-col gap-2" noValidate>
          <label className="sr-only" htmlFor="login-email">
            {t("email")}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            className={input}
          />
          <label className="sr-only" htmlFor="login-password">
            {t("password")}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder={`${t("password")} · ${t("passwordPlaceholder")}`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            className={input}
          />
          <p role="alert" className={`min-h-5 ${fieldError}`}>
            {error}
          </p>
          <button type="submit" className="min-h-12 rounded-xl border border-line font-bold hover:bg-mist">
            {t("emailSubmit")}
          </button>
        </form>
        <p className="text-center text-sm text-muted">{t("signupHint")}</p>
      </div>
    </div>
  );
}
