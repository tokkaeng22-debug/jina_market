"use client";

import { useSyncExternalStore } from "react";

/**
 * 아직 DB에 연결하지 않은 학습 기록 (브라우저 localStorage): 강의 진도 · 과제 제출.
 * 영상(Cloudflare Stream)과 과제 게시판을 붙일 때 lesson_progress · submissions 테이블로 옮긴다.
 * 로그인 · 상품 · 주문 · 권한 · 배지는 이미 Supabase를 쓴다.
 */
export type DemoState = {
  /** 강의별 완료한 강 수 */
  progress: Record<string, number>;
  submissions: { slug: string; lesson: number; body: string; createdAt: number }[];
};

const KEY = "makegrow-learning-v1";
const EMPTY: DemoState = { progress: {}, submissions: [] };

let cache: { raw: string | null; state: DemoState } = { raw: null, state: EMPTY };
const listeners = new Set<() => void>();

function read(): DemoState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache.state;
  }
  if (raw === cache.raw) return cache.state;
  let state = EMPTY;
  try {
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Partial<DemoState>) };
  } catch {}
  cache = { raw, state };
  return state;
}

function write(next: DemoState) {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(KEY, raw);
  } catch {}
  cache = { raw, state: next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDemo() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** 서버 렌더 · 하이드레이션 중에는 false. localStorage 값으로 화면을 바꾸기 전에 확인한다 */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export const demo = {
  completeLesson(slug: string, total: number) {
    const s = read();
    const done = Math.min(total, (s.progress[slug] ?? 0) + 1);
    write({ ...s, progress: { ...s.progress, [slug]: done } });
  },
  submitAssignment(slug: string, lesson: number, body: string) {
    const s = read();
    write({ ...s, submissions: [{ slug, lesson, body, createdAt: Date.now() }, ...s.submissions] });
  },
  reset() {
    write(EMPTY);
  },
};
