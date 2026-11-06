"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getDemoProduct } from "@/lib/demo/products";
import { demo, useDemo, useHydrated } from "@/lib/demo/store";
import { btnPrimary, btnSecondary, card, fieldError, input } from "@/components/ui/styles";

/** 학습 화면: 권한이 있을 때만 영상 자리와 과제 제출을 보여 준다 */
export function LearnView({ slug }: { slug: string }) {
  const t = useTranslations("Learn");
  const locale = useLocale() as Locale;
  const { owned, progress } = useDemo();
  const hydrated = useHydrated();
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<"" | "empty" | "sent">("");
  const product = getDemoProduct(slug)!;
  const lessons = product.lessons ?? [];

  if (!hydrated) return null;

  if (!owned.includes(slug)) {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="font-bold">{t("locked")}</p>
        <Link href={`/products/${slug}`} className={btnPrimary}>
          {t("viewProduct")}
        </Link>
      </div>
    );
  }

  const done = progress[slug] ?? 0;
  const current = Math.min(done, lessons.length - 1);
  const finished = done >= lessons.length;
  const percent = Math.round((done / lessons.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/account" className="w-fit text-sm font-bold text-sky-700 hover:underline">
        ← {t("back")}
      </Link>

      <div className="grid aspect-video place-items-center rounded-3xl bg-sky-600 p-4 text-center text-white">
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl" aria-hidden="true">
            ▶
          </span>
          <span className="font-bold">{t("player")}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-sky-700">
          {product.title[locale]} · {t("progress", { percent })}
        </p>
        <h1 className="text-2xl font-extrabold">
          {finished ? t("allDone") : `${t("lessonOf", { n: current + 1 })} · ${lessons[current].title[locale]}`}
        </h1>
      </div>

      {!finished && (
        <button type="button" onClick={() => demo.completeLesson(slug, lessons.length)} className={`${btnPrimary} w-full sm:w-fit`}>
          {t("completeNext")}
        </button>
      )}

      <section aria-labelledby="lessons" className="flex flex-col gap-2">
        <h2 id="lessons" className="text-lg font-extrabold">
          {t("lessons")}
        </h2>
        <ol className="divide-y divide-line rounded-2xl border border-line">
          {lessons.map((lesson, i) => {
            const isDone = i < done;
            const isCurrent = !finished && i === current;
            return (
              <li key={i} aria-current={isCurrent ? "step" : undefined} className={`flex items-center gap-3 px-4 py-3 ${isCurrent ? "bg-mist font-bold" : ""}`}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${isDone ? "bg-sky-700 text-on-accent" : "border border-line"}`}>
                  {isDone ? "✓" : i + 1}
                </span>
                <span className={isDone ? "text-muted" : ""}>{lesson.title[locale]}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="assignment" className="flex flex-col gap-2">
        <h2 id="assignment" className="text-lg font-extrabold">
          {t("assignment")}
        </h2>
        <p className="text-muted">{t("assignmentHint", { n: current + 1 })}</p>
        <label htmlFor="assignment-body" className="sr-only">
          {t("assignment")}
        </label>
        <textarea
          id="assignment-body"
          rows={4}
          value={body}
          placeholder={t("assignmentPlaceholder")}
          onChange={(e) => {
            setBody(e.target.value);
            setMsg("");
          }}
          className={`${input} py-3`}
        />
        <p role="status" className={`min-h-5 ${msg === "empty" ? fieldError : "text-sm font-bold text-sky-700"}`}>
          {msg === "empty" ? t("assignmentEmpty") : msg === "sent" ? t("submitted") : ""}
        </p>
        <button
          type="button"
          className={`${btnSecondary} w-full sm:w-fit`}
          onClick={() => {
            if (!body.trim()) return setMsg("empty");
            demo.submitAssignment(slug, current + 1, body.trim());
            setBody("");
            setMsg("sent");
          }}
        >
          {t("submit")}
        </button>
      </section>
    </div>
  );
}
