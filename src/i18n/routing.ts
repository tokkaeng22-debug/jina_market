import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  // 모든 URL에 언어 접두사를 붙인다 (/ko, /en). hreflang 짝이 명확해진다.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
