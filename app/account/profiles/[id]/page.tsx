import { createClient } from "@/app/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  CalendarDays,
  CreditCard,
  MapPin,
  Phone,
  UserRound,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Inbox,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
};

/* ------------------------------------------------------------------ */
/* Formatters (fixed locale + time zone => stable output)              */
/* ------------------------------------------------------------------ */

const currency = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Dhaka",
});

const formatDate = (iso: string) => dateFmt.format(new Date(iso));
const formatTime = (iso: string) => timeFmt.format(new Date(iso));

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  pending: { pill: "bg-amber-50 text-amber-700 ring-amber-200/80", dot: "bg-amber-500" },
  processing: { pill: "bg-sky-50 text-sky-700 ring-sky-200/80", dot: "bg-sky-500" },
  shipped: { pill: "bg-indigo-50 text-indigo-700 ring-indigo-200/80", dot: "bg-indigo-500" },
  delivered: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200/80", dot: "bg-emerald-500" },
  completed: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200/80", dot: "bg-emerald-500" },
  paid: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200/80", dot: "bg-emerald-500" },
  cancelled: { pill: "bg-rose-50 text-rose-700 ring-rose-200/80", dot: "bg-rose-500" },
  failed: { pill: "bg-rose-50 text-rose-700 ring-rose-200/80", dot: "bg-rose-500" },
  refunded: { pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

const FALLBACK_STYLE = {
  pill: "bg-slate-100 text-slate-600 ring-slate-200",
  dot: "bg-slate-400",
};

function StatusBadge({ value }: { value: string | null }) {
  const status = (value ?? "unknown").toLowerCase();
  const style = STATUS_STYLES[status] ?? FALLBACK_STYLE;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${style.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* URL helper (keeps filters when paginating / switching status)       */
/* ------------------------------------------------------------------ */

function buildHref(
  id: string,
  params: { page?: number; status?: string; q?: string }
) {
  const sp = new URLSearchParams();
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return `/account/profiles/${id}/orders${qs ? `?${qs}` : ""}`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function CustomerOrdersPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  // 1. Authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2. Admin authorization
  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminError || adminProfile?.role !== "admin") redirect("/account");

  // 3. Customer profile
  const { data: customer, error: customerError } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .eq("id", id)
    .single();

  if (customerError || !customer) notFound();

  // 4. Lightweight query for stats + status chips (2 columns only)
  const { data: summaryRows, error: summaryError } = await supabase
    .from("orders")
    .select("status, total")
    .eq("user_id", customer.id);

  if (summaryError) throw new Error("Failed to fetch order summary");

  const summary = summaryRows ?? [];
  const totalOrders = summary.length;
  const totalSpent = summary.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const deliveredOrders = summary.filter(
    (o) => o.status?.toLowerCase() === "delivered"
  ).length;

  const statusCounts = new Map<string, number>();
  summary.forEach((o) => {
    const s = o.status ?? "unknown";
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  });

  // Validate filters from the URL
  const activeStatus =
    sp.status && statusCounts.has(sp.status) ? sp.status : "all";
  const q = (sp.q ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 60);
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // 5. One page of orders (server-side filter + pagination)
  const from = (requestedPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let ordersQuery = supabase
    .from("orders")
    .select(
      "id, full_name, phone, city, address_line, subtotal, shipping_cost, tax, total, payment_method, payment_status, status, created_at",
      { count: "exact" }
    )
    .eq("user_id", customer.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (activeStatus !== "all") ordersQuery = ordersQuery.eq("status", activeStatus);
  if (q) ordersQuery = ordersQuery.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data: orders, count, error: ordersError } = await ordersQuery;

  if (ordersError) throw new Error("Failed to fetch customer orders");

  const filteredTotal = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));

  // Out-of-range page -> go to the last valid page
  if (requestedPage > pageCount) {
    redirect(buildHref(id, { page: pageCount, status: activeStatus, q }));
  }

  const pageOrders = orders ?? [];
  const orderIds = pageOrders.map((o) => o.id);

  // 6. Items only for the orders on this page
  const { data: orderItems, error: itemsError } =
    orderIds.length > 0
      ? await supabase
          .from("order_items")
          .select("id, order_id, product_id, quantity, price")
          .in("order_id", orderIds)
      : { data: [], error: null };

  if (itemsError) throw new Error("Failed to fetch order items");

  const itemsByOrder = new Map<string | number, NonNullable<typeof orderItems>>();
  for (const item of orderItems ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const showingFrom = filteredTotal === 0 ? 0 : from + 1;
  const showingTo = Math.min(from + PAGE_SIZE, filteredTotal);

  const GRID =
    "grid grid-cols-[minmax(0,1fr)_auto_auto_20px] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto_20px] items-center gap-x-3 sm:gap-x-4";

  return (
    <main className="min-h-screen bg-[#f6f7fb] bg-[radial-gradient(60%_40%_at_50%_-10%,#e6ebff_0%,transparent_70%)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
              <ShoppingBag size={17} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Store Management
              </p>
              <h1 className="text-[15px] font-bold leading-tight text-slate-900">
                Customer Orders
              </h1>
            </div>
          </div>

          <Link
            href="/account/profiles"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">All Profiles</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        {/* Customer strip */}
        <section className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.7)]">
            {(customer.email ?? "U").charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-slate-900">
              {customer.email ?? "No email"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold capitalize text-slate-600">
                <ShieldCheck size={11} />
                {customer.role}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                Joined {formatDate(customer.created_at)}
              </span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard title="Orders" value={totalOrders.toString()} icon={<ShoppingBag size={15} />} tone="bg-indigo-50 text-indigo-600" />
          <StatCard title="Order value" value={currency(totalSpent)} icon={<CreditCard size={15} />} tone="bg-violet-50 text-violet-600" />
          <StatCard title="Avg. order" value={currency(averageOrder)} icon={<TrendingUp size={15} />} tone="bg-sky-50 text-sky-600" />
          <StatCard title="Delivered" value={deliveredOrders.toString()} icon={<Package size={15} />} tone="bg-emerald-50 text-emerald-600" />
        </section>

        {/* Orders table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)]">
          {/* Toolbar */}
          <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Chip
                href={buildHref(id, { q })}
                active={activeStatus === "all"}
                label="All"
                count={totalOrders}
              />
              {Array.from(statusCounts.entries()).map(([status, n]) => (
                <Chip
                  key={status}
                  href={buildHref(id, { status, q })}
                  active={activeStatus === status}
                  label={status}
                  count={n}
                />
              ))}
            </div>

            {/* Plain GET form: works with no client JS */}
            <form
              action={`/account/profiles/${id}/orders`}
              method="get"
              className="relative w-full lg:w-64"
              role="search"
            >
              {activeStatus !== "all" && (
                <input type="hidden" name="status" value={activeStatus} />
              )}
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search name or phone"
                aria-label="Search orders by name or phone"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </form>
          </div>

          {/* Column header */}
          <div
            className={`${GRID} border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500`}
          >
            <span>Order</span>
            <span className="hidden sm:block">Payment</span>
            <span>Status</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {/* Rows */}
          {pageOrders.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Inbox size={20} />
              </div>
              <p className="font-semibold text-slate-800">
                {totalOrders === 0 ? "No orders yet" : "No matching orders"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {totalOrders === 0
                  ? "This customer has not placed any orders."
                  : "Try a different search or status filter."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pageOrders.map((order) => {
                const items = itemsByOrder.get(order.id) ?? [];
                const itemCount = items.reduce(
                  (n, i) => n + Number(i.quantity ?? 0),
                  0
                );

                return (
                  <details key={order.id} className="group open:bg-indigo-50/30">
                    <summary
                      className={`${GRID} cursor-pointer list-none px-4 py-2.5 outline-none transition-colors hover:bg-slate-50/70 focus-visible:bg-slate-50 [&::-webkit-details-marker]:hidden`}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900">
                          #{order.id}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {formatDate(order.created_at)} · {itemCount}{" "}
                          {itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>

                      <div className="hidden min-w-0 sm:block">
                        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-700">
                          {order.payment_method ?? "N/A"}
                        </p>
                        <div className="mt-0.5">
                          <StatusBadge value={order.payment_status} />
                        </div>
                      </div>

                      <StatusBadge value={order.status} />

                      <p className="text-right text-[13px] font-semibold tabular-nums text-slate-900">
                        {currency(Number(order.total ?? 0))}
                      </p>

                      <ChevronDown
                        size={16}
                        className="text-slate-400 transition-transform duration-300 group-open:rotate-180 group-open:text-indigo-600"
                      />
                    </summary>

                    {/* Details panel */}
                    <div className="grid gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 lg:grid-cols-5">
                      {/* Items */}
                      <div className="rounded-xl border border-slate-200/80 bg-white lg:col-span-3">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5">
                          <Package size={14} className="text-slate-400" />
                          <h4 className="text-[13px] font-semibold text-slate-800">
                            Ordered products
                          </h4>
                          <span className="ml-auto text-[11px] text-slate-400">
                            {formatDate(order.created_at)} · {formatTime(order.created_at)}
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <p className="px-3.5 py-5 text-sm text-slate-400">
                            No order items found.
                          </p>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {items.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center justify-between gap-3 px-3.5 py-2"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                                    <Package size={13} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-[13px] font-medium text-slate-800">
                                      Product #{item.product_id}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {item.quantity} × {currency(Number(item.price))}
                                    </p>
                                  </div>
                                </div>
                                <p className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-700">
                                  {currency(Number(item.price) * Number(item.quantity))}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Delivery + summary */}
                      <div className="space-y-3 lg:col-span-2">
                        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                          <h4 className="mb-2.5 text-[13px] font-semibold text-slate-800">
                            Delivery
                          </h4>
                          <div className="space-y-2">
                            <Line icon={<UserRound size={13} />} value={order.full_name ?? "N/A"} />
                            <Line icon={<Phone size={13} />} value={order.phone ?? "N/A"} />
                            <Line
                              icon={<MapPin size={13} />}
                              value={
                                [order.address_line, order.city]
                                  .filter(Boolean)
                                  .join(", ") || "N/A"
                              }
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                          <h4 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                            <CreditCard size={13} className="text-slate-400" />
                            Summary
                          </h4>
                          <dl className="space-y-1 text-[13px]">
                            <SummaryRow label="Subtotal" value={currency(Number(order.subtotal ?? 0))} />
                            <SummaryRow label="Shipping" value={currency(Number(order.shipping_cost ?? 0))} />
                            <SummaryRow label="Tax" value={currency(Number(order.tax ?? 0))} />
                            <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                              <dt className="font-semibold text-slate-800">Total</dt>
                              <dd className="text-[15px] font-bold tabular-nums text-slate-900">
                                {currency(Number(order.total ?? 0))}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredTotal > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {showingFrom}–{showingTo}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">{filteredTotal}</span>
              </p>

              <div className="flex items-center gap-1.5">
                <Pager
                  label="Previous page"
                  disabled={requestedPage <= 1}
                  href={buildHref(id, { page: requestedPage - 1, status: activeStatus, q })}
                >
                  <ChevronLeft size={15} />
                </Pager>

                <span className="min-w-[56px] text-center text-xs font-medium text-slate-600">
                  {requestedPage} / {pageCount}
                </span>

                <Pager
                  label="Next page"
                  disabled={requestedPage >= pageCount}
                  href={buildHref(id, { page: requestedPage + 1, status: activeStatus, q })}
                >
                  <ChevronRight size={15} />
                </Pager>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_rgba(16,24,40,0.1)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 truncate text-lg font-bold tracking-tight tabular-nums text-slate-900 sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function Chip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-300 ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-px text-[10px] tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-white text-slate-500"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

function Pager({
  href,
  label,
  disabled,
  children,
}: {
  href: string;
  label: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 outline-none transition";

  if (disabled) {
    return (
      <span aria-label={label} aria-disabled="true" className={`${base} cursor-not-allowed opacity-40`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={`${base} hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-300`}
    >
      {children}
    </Link>
  );
}

function Line({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px] text-slate-700">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <span className="break-words">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-700">{value}</dd>
    </div>
  );
}