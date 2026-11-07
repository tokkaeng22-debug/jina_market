"use client";

import { useSyncExternalStore } from "react";
import type { Provider, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/env";

/**
 * 브라우저의 Supabase 로그인 상태. 화면 어디서나 useAuth()로 읽는다.
 * 세션은 쿠키에 있고, proxy.ts가 요청마다 갱신한다.
 */
export type LoginVia = "kakao" | "google" | "email";
export type AuthUser = { id: string; email: string | null; name: string; via: LoginVia };
export type AuthState = { status: "loading" | "signedOut" | "signedIn"; user: AuthUser | null };

const LOADING: AuthState = { status: "loading", user: null };
const SIGNED_OUT: AuthState = { status: "signedOut", user: null };

let state: AuthState = LOADING;
let started = false;
const listeners = new Set<() => void>();

let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
export function supabaseBrowser() {
  if (!client) client = createSupabaseBrowserClient();
  return client;
}

function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const provider = user.app_metadata?.provider;
  const via: LoginVia = provider === "kakao" || provider === "google" ? provider : "email";
  const name =
    (meta.name as string | undefined) ||
    (meta.full_name as string | undefined) ||
    (meta.nickname as string | undefined) ||
    user.email?.split("@")[0] ||
    "";
  return { id: user.id, email: user.email ?? null, name, via };
}

function set(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

function start() {
  if (started) return;
  started = true;
  if (!getSupabaseEnv()) {
    set(SIGNED_OUT);
    return;
  }
  // INITIAL_SESSION이 먼저 한 번 오고, 이후 로그인 · 로그아웃 · 토큰 갱신마다 온다.
  supabaseBrowser().auth.onAuthStateChange((_event, session) => {
    set(session?.user ? { status: "signedIn", user: toAuthUser(session.user) } : SIGNED_OUT);
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuth() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}

export async function signOut() {
  if (!getSupabaseEnv()) return;
  await supabaseBrowser().auth.signOut();
}

/**
 * 대시보드에서 켜 둔 간편 로그인 (Supabase /auth/v1/settings, 공개 정보).
 * 꺼진 제공자를 누르면 Supabase가 JSON 에러 화면을 보여주므로 미리 확인한다.
 */
let providersPromise: Promise<Record<string, boolean>> | null = null;
export function enabledProviders() {
  const env = getSupabaseEnv();
  if (!env) return Promise.resolve({} as Record<string, boolean>);
  providersPromise ??= fetch(`${env.url}/auth/v1/settings`, { headers: { apikey: env.key } })
    .then((r) => (r.ok ? r.json() : { external: {} }))
    .then((s: { external?: Record<string, boolean> }) => s.external ?? {})
    .catch(() => ({}));
  return providersPromise;
}

/** 로그인 후 돌아올 주소. 지금 보고 있는 페이지로 돌아온다. */
export function callbackUrl(nextPath: string) {
  return `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export async function signInWithProvider(provider: Extract<Provider, "kakao" | "google">, nextPath: string) {
  const { error } = await supabaseBrowser().auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl(nextPath) },
  });
  return error;
}
