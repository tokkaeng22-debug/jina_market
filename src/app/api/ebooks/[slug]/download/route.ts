import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProduct } from "@/lib/catalog/server";
import { readObject } from "@/lib/storage/r2";
import { watermarkPdf } from "@/lib/storage/watermark";

/**
 * 전자책 다운로드. 로그인 → 유효한 권한(entitlements) 확인 → R2에서 최신 PDF를 읽어 구매자 워터마크를 찍어 내려준다.
 * ebook_files는 RLS로 권한이 있는 사람에게만 보이므로 로그인 사용자의 클라이언트로 읽는다.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/ebooks/[slug]/download">) {
  const { slug } = await ctx.params;
  const product = await getProduct(slug);
  if (product?.type !== "ebook") return new Response("not found", { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return new Response("login required", { status: 401 });

  const { data: ents } = await supabase
    .from("entitlements")
    .select("source_order_id, expires_at, revoked_at")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .is("revoked_at", null);
  const now = Date.now();
  const entitlement = ents?.find((e) => !e.expires_at || Date.parse(e.expires_at) > now);
  if (!entitlement) return new Response("forbidden", { status: 403 });

  const { data: file } = await supabase
    .from("ebook_files")
    .select("r2_key, version")
    .eq("product_id", product.id)
    .eq("format", "pdf")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!file) return new Response("file not ready", { status: 404 });

  const original = await readObject(file.r2_key as string);
  if (!original) return new Response("file not ready", { status: 404 });

  const order = entitlement.source_order_id ? String(entitlement.source_order_id).slice(0, 8).toUpperCase() : "GIFT";
  const date = new Date(now).toISOString().slice(0, 10);
  const pdf = await watermarkPdf(original, `Licensed to ${user.email ?? user.id} | Order ${order} | ${date} | Do not share`);

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-v${file.version}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
