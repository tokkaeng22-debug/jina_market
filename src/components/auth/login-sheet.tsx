"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AuthError } from "@supabase/supabase-js";
import { callbackUrl, enabledProviders, signInWithProvider, supabaseBrowser } from "@/lib/auth/use-auth";
import { fieldError, input } from "@/components/ui/styles";

type Mode = "signin" | "signup";

function currentPath() {
  const params = new URLSearchParams(window.location.search);
  params.delete("login");
  const qs = params.toString();
  return window.location.pathname + (qs ? `?${qs}` : "");
}

/**
 * 결제 화면 위에 뜨는 로그인 창 (PLAN.md 5-1: 페이지 이동 없이 로그인).
 * 간편 로그인(카카오 · Google)을 위에, 이메일을 아래에 둔다.
 * 이메일 로그인은 이 창 안에서 끝나고, 간편 로그인은 제공자 화면을 거쳐 지금 페이지로 돌아온다.
 */
export function LoginSheet({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");
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

  function messageFor(err: AuthError) {
    switch (err.code) {
      case "invalid_credentials":
        return t("wrongCredentials");
      case "email_not_confirmed":
        return t("emailNotConfirmed");
      case "user_already_exists":
      case "email_exists":
        return t("alreadyRegistered");
      case "weak_password":
        return t("shortPassword");
      default:
        return t("genericError");
    }
  }

  async function social(provider: "kakao" | "google") {
    setError("");
    setBusy(true);
    const enabled = await enabledProviders();
    if (!enabled[provider]) {
      setBusy(false);
      return setError(t("providerSoon", { provider: t(`via.${provider}`) }));
    }
    // 성공하면 제공자 화면으로 이동하므로 busy를 풀지 않는다
    const err = await signInWithProvider(provider, currentPath());
    if (err) {
      setBusy(false);
      setError(t("genericError"));
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError(t("invalidEmail"));
    if (password.length < 8) return setError(t("shortPassword"));
    setBusy(true);
    setError("");
    try {
      const auth = supabaseBrowser().auth;
      if (mode === "signin") {
        const { error: err } = await auth.signInWithPassword({ email: address, password });
        if (err) return setError(messageFor(err));
      } else {
        const { data, error: err } = await auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: callbackUrl(currentPath()), data: { locale } },
        });
        if (err) return setError(messageFor(err));
        // 확인 메일을 쓰는 설정에서 이미 가입된 이메일이면 identities가 비어서 온다
        if (data.user && data.user.identities?.length === 0) return setError(t("alreadyRegistered"));
        if (!data.session) {
          setPassword("");
          return setSentTo(address);
        }
      }
    } catch (err) {
      // 설정 누락 · 네트워크 오류: 버튼이 "잠시만요"에 멈추지 않게 한다
      console.error(err);
      return setError(t("genericError"));
    } finally {
      setBusy(false);
    }
    setPassword("");
    onSuccess?.();
    onClose();
  }

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
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
              {sentTo ? t("checkInboxTitle") : mode === "signin" ? t("sheetTitle") : t("signupTitle")}
            </h2>
            <p className="mt-1 text-muted">{sentTo ? t("checkInbox", { email: sentTo }) : t("sheetBody")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="grid size-10 place-items-center rounded-full text-2xl hover:bg-mist">
            ×
          </button>
        </div>

        {sentTo ? (
          <button
            type="button"
            onClick={() => {
              setSentTo("");
              setMode("signin");
            }}
            className="min-h-12 rounded-xl border border-line font-bold hover:bg-mist"
          >
            {t("backToLogin")}
          </button>
        ) : (
          <>
            <button
              ref={firstButton}
              type="button"
              disabled={busy}
              onClick={() => social("kakao")}
              className="min-h-12 rounded-xl bg-[#FEE500] font-bold text-[#191919] hover:brightness-95 disabled:opacity-60"
            >
              {t("kakao")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => social("google")}
              className="min-h-12 rounded-xl border border-line bg-white font-bold text-[#1f1f1f] hover:bg-gray-50 disabled:opacity-60"
            >
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
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
              <button type="submit" disabled={busy} className="min-h-12 rounded-xl border border-line font-bold hover:bg-mist disabled:opacity-60">
                {busy ? t("working") : mode === "signin" ? t("emailSubmit") : t("signupSubmit")}
              </button>
            </form>
            <button type="button" onClick={switchMode} className="min-h-11 text-center text-sm font-bold text-muted underline underline-offset-4">
              {mode === "signin" ? t("toSignup") : t("toSignin")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
