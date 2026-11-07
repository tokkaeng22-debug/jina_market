import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { formatAmount } from "@/lib/catalog/types";
import { getAdminUser, listOrders, ORDER_STATUSES, type OrderStatus } from "@/lib/admin/server";
import { AdminDenied, AdminNav } from "@/components/admin/admin-nav";
import { OrderActions } from "@/components/admin/order-actions";
import { PageFallback } from "@/components/ui/page-fallback";
import { card, chip } from "@/components/ui/styles";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return pageMetadata({ locale: locale as Locale, path: "/admin", title: t("orders"), noindex: true });
}

export default function AdminOrdersPage(props: PageProps<"/[locale]/admin">) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Suspense fallback={<PageFallback />}>
        <OrdersContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

const statusTone: Record<OrderStatus, string> = {
  awaiting_deposit: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  pending: "bg-mist text-muted",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  refunded: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  failed: "bg-mist text-muted",
};

async function OrdersContent({
  params,
  searchParams,
}: {
  params: PageProps<"/[locale]/admin">["params"];
  searchParams: PageProps<"/[locale]/admin">["searchParams"];
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  if (!(await getAdminUser())) return <AdminDenied />;

  const sp = await searchParams;
  const filter = ORDER_STATUSES.find((s) => s === sp.status) ?? null;
  const orders = await listOrders(filter, locale);
  const dateFmt = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });

  const filterLink = (status: OrderStatus | null, label: string) => {
    const active = status === filter;
    return (
      <Link
        key={status ?? "all"}
        href={status ? { pathname: "/admin", query: { status } } : "/admin"}
        className={`rounded-full border px-3 py-1.5 text-sm font-bold ${active ? "border-sky-700 bg-sky-700 text-on-accent" : "border-line hover:bg-mist"}`}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <AdminNav current="orders" />
      <div className="flex flex-wrap gap-2">
        {filterLink(null, t("all"))}
        {ORDER_STATUSES.map((s) => filterLink(s, t(`status.${s}`)))}
      </div>
      <p className="text-sm text-muted">{t("ordersHint")}</p>

      {orders.length === 0 ? (
        <p className={`${card} font-bold`}>{t("noOrders")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const label = o.id.slice(0, 8).toUpperCase();
            const open = o.status === "pending" || o.status === "awaiting_deposit";
            return (
              <li key={o.id} className="flex flex-col gap-2 rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${statusTone[o.status]}`}>{t(`status.${o.status}`)}</span>
                    <span className="font-mono text-sm text-muted">{label}</span>
                  </div>
                  <span className="text-lg font-extrabold">{formatAmount(o.amount, o.currency, locale)}</span>
                </div>
                <p className="font-bold">{o.product?.title ?? "-"}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted">{t("buyer")}</dt>
                  <dd className="break-all">{o.email}</dd>
                  <dt className="text-muted">{t("method")}</dt>
                  <dd>
                    {o.payMethod && t.has(`methods.${o.payMethod}`) ? t(`methods.${o.payMethod}`) : (o.payMethod ?? "-")}{" "}
                    <span className={chip}>{o.provider}</span>
                  </dd>
                  <dt className="text-muted">{t("orderedAt")}</dt>
                  <dd>{dateFmt.format(new Date(o.createdAt))}</dd>
                  {o.paidAt && (
                    <>
                      <dt className="text-muted">{t("paidAt")}</dt>
                      <dd>{dateFmt.format(new Date(o.paidAt))}</dd>
                    </>
                  )}
                </dl>
                <OrderActions
                  orderId={o.id}
                  label={label}
                  canRecheck={o.provider === "portone" && o.status !== "failed"}
                  canMarkPaid={open}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
