import { notFound } from "next/navigation";

/** /ko/없는-주소 → 언어별 not-found 페이지로 보낸다 */
export default function CatchAll() {
  notFound();
}
