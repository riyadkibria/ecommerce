
"use client";

import { Fragment, useMemo, useState } from "react";

type OrderItem = {
  id?: string | number;
  product_id?: string | number | null;
  product_title?: string | null;
  quantity?: number | string | null;
  price?: number | string | null;
};

type Shipment = {
  status?: string | null;
  courier_id?: string | number | null;
};

type Order = {
  id: number;
  user_id: string | null;
  full_name: string;
  phone: string;
  city: string;
  address_line: string;
  courier_slug: string;
  redx_area_id: number | null;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  aamarpay_tran_id?: string | null;
  created_at: string;
  customer_email: string | null;
  items: OrderItem[];
  shipment: Shipment | null;
};

type Props = {
  orders: Order[];
};

const formatBDT = (amount: number | string | null | undefined) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(parsed);
};

function formatLabel(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitials(name?: string) {
  if (!name?.trim()) return "GU";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getStatusStyle(status?: string | null) {
  const value = status?.toLowerCase() ?? "unknown";

  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    processing: "bg-blue-50 text-blue-700 ring-blue-200",
    shipped: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    in_transit: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    picked_up: "bg-violet-50 text-violet-700 ring-violet-200",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
    canceled: "bg-rose-50 text-rose-700 ring-rose-200",
    failed: "bg-rose-50 text-rose-700 ring-rose-200",
    unpaid: "bg-amber-50 text-amber-700 ring-amber-200",
    refunded: "bg-purple-50 text-purple-700 ring-purple-200",
  };

  return (
    styles[value] ??
    "bg-slate-100 text-slate-600 ring-slate-200"
  );
}

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const value = status?.toLowerCase() ?? "unknown";

  const dotColors: Record<string, string> = {
    pending: "bg-amber-500",
    processing: "bg-blue-500",
    shipped: "bg-indigo-500",
    in_transit: "bg-indigo-500",
    picked_up: "bg-violet-500",
    delivered: "bg-emerald-500",
    completed: "bg-emerald-500",
    paid: "bg-emerald-500",
    cancelled: "bg-rose-500",
    canceled: "bg-rose-500",
    failed: "bg-rose-500",
    unpaid: "bg-amber-500",
    refunded: "bg-purple-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10px] font-bold capitalize ring-1 ring-inset ${getStatusStyle(status)}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dotColors[value] ?? "bg-slate-400"
        }`}
      />
      {formatLabel(status)}
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-xs font-semibold leading-5 text-slate-700">
        {value === null || value === undefined || value === ""
          ? "N/A"
          : String(value)}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold tabular-nums text-slate-800">
        {value}
      </span>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.13em] text-slate-700">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}

function OrderDetails({ order }: { order: Order }) {
  const items = order.items ?? [];

  return (
    <div className="border-t border-slate-200 bg-[#f8faff] p-4 sm:p-6">
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Customer */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <SectionHeading
            title="Customer information"
            subtitle="Contact and delivery details"
          />

          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <Detail label="Full name" value={order.full_name} />
            <Detail label="Phone" value={order.phone} />
            <Detail
              label="Email"
              value={order.customer_email}
            />
            <Detail label="City" value={order.city} />

            <div className="col-span-2">
              <Detail
                label="Delivery address"
                value={order.address_line}
              />
            </div>

            <div className="col-span-2">
              <Detail label="User ID" value={order.user_id} />
            </div>
          </div>
        </section>

        {/* Courier and payment */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <SectionHeading
            title="Courier & payment"
            subtitle="Shipping and transaction information"
          />

          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <Detail
              label="Courier"
              value={formatLabel(order.courier_slug)}
            />
            <Detail
              label="Shipment status"
              value={formatLabel(order.shipment?.status)}
            />
            <Detail
              label="Courier ID"
              value={order.shipment?.courier_id}
            />
            <Detail
              label="REDX area ID"
              value={order.redx_area_id}
            />
            <Detail
              label="Payment method"
              value={formatLabel(order.payment_method)}
            />
            <Detail
              label="Payment status"
              value={formatLabel(order.payment_status)}
            />

            <div className="col-span-2">
              <Detail
                label="aamarPay transaction ID"
                value={order.aamarpay_tran_id}
              />
            </div>

            <div className="col-span-2">
              <Detail
                label="Order created"
                value={formatDate(order.created_at)}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Ordered products */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Ordered products
            </h3>
            <p className="mt-1 text-[10px] text-slate-400">
              Products included in this order
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">
            {items.length} products
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Product</th>
                <th className="px-5 py-3 text-center">Quantity</th>
                <th className="px-5 py-3 text-right">Price</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr
                  key={`${order.id}-${item.id ?? item.product_id ?? index}`}
                  className="transition hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        >
                          <path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" />
                          <path d="m4 7 8 4 8-4M12 11v10" />
                        </svg>
                      </div>

                      <span className="font-semibold text-slate-800">
                        {item.product_title || "Untitled product"}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-center font-medium text-slate-600">
                    {Number(item.quantity ?? 0)}
                  </td>

                  <td className="px-5 py-4 text-right text-slate-600">
                    {formatBDT(item.price)}
                  </td>

                  <td className="px-5 py-4 text-right font-bold text-slate-900">
                    {formatBDT(
                      Number(item.price ?? 0) *
                        Number(item.quantity ?? 0)
                    )}
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-xs text-slate-400"
                  >
                    No product information found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Financial summary */}
      <div className="mt-4 flex justify-end">
        <section className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-5">
          <SectionHeading
            title="Financial summary"
            subtitle="Order amount breakdown"
          />

          <SummaryRow
            label="Subtotal"
            value={formatBDT(order.subtotal)}
          />
          <SummaryRow
            label="Shipping"
            value={formatBDT(order.shipping_cost)}
          />
          <SummaryRow label="Tax" value={formatBDT(order.tax)} />

          <div className="mt-3 rounded-xl bg-[#101b36] p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-300">
                Grand total
              </span>
              <span className="text-xl font-bold tracking-tight">
                {formatBDT(order.total)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function OrdersTable({ orders }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const filteredOrders = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesSearch =
        !searchText ||
        String(order.id).includes(searchText) ||
        (order.full_name ?? "").toLowerCase().includes(searchText) ||
        (order.phone ?? "").toLowerCase().includes(searchText) ||
        (order.customer_email ?? "").toLowerCase().includes(searchText) ||
        (order.city ?? "").toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        order.status?.toLowerCase() === statusFilter;

      const matchesPayment =
        paymentFilter === "all" ||
        order.payment_status?.toLowerCase() === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    paymentFilter !== "all";

  const totalValue = filteredOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
  }

  function toggleOrder(id: number) {
    setExpandedOrder((current) => (current === id ? null : id));
  }

  return (
    <section className="space-y-5">
      {/* Search and filters */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(200px,1fr)_190px_190px]">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" />
          </svg>

          <input
            type="search"
            placeholder="Search order, customer, phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#f8faff] pl-11 pr-4 text-xs font-medium text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-[#f8faff] px-4 text-xs font-semibold text-slate-600 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:bg-white"
        >
          <option value="all">All order statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-[#f8faff] px-4 text-xs font-semibold text-slate-600 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:bg-white"
        >
          <option value="all">All payment statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Result summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>
            Showing{" "}
            <strong className="font-bold text-slate-900">
              {filteredOrders.length}
            </strong>{" "}
            of {orders.length} orders
          </span>

          <span className="text-slate-300">·</span>

          <span>
            Total value:{" "}
            <strong className="font-bold text-slate-900">
              {formatBDT(totalValue)}
            </strong>
          </span>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg px-3 py-2 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                <th className="px-4 py-4">Order</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Products</th>
                <th className="px-4 py-4">Amount</th>
                <th className="px-4 py-4">Payment</th>
                <th className="px-4 py-4">Courier</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOrders.map((order, index) => {
                const isExpanded = expandedOrder === order.id;

                const productCount = (order.items ?? []).reduce(
                  (sum, item) =>
                    sum + Number(item.quantity ?? 0),
                  0
                );

                return (
                  <Fragment key={order.id}>
                    <tr className="group transition-colors hover:bg-[#f8faff]">
                      <td className="px-4 py-4">
                        <p className="font-mono text-xs font-bold text-blue-700">
                          #{order.id}
                        </p>

                        <p className="mt-1.5 whitespace-nowrap text-[10px] text-slate-400">
                          {formatDate(order.created_at)}
                        </p>

                        <p className="mt-1 text-[9px] text-slate-300">
                          #{index + 1}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-[10px] font-bold text-blue-700">
                            {getInitials(order.full_name)}
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-40 truncate text-xs font-bold text-slate-800">
                              {order.full_name || "Guest customer"}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-500">
                              {order.phone || "No phone"}
                            </p>

                            <p className="mt-1 max-w-40 truncate text-[10px] text-slate-400">
                              {order.customer_email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-xs font-bold text-slate-800">
                          {(order.items ?? []).length} products
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {productCount} total units
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900">
                          {formatBDT(order.total)}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Shipping: {formatBDT(order.shipping_cost)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-[10px] font-bold uppercase text-slate-700">
                          {formatLabel(order.payment_method)}
                        </p>
                        <div className="mt-2">
                          <StatusBadge status={order.payment_status} />
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-[10px] font-bold text-slate-700">
                          {formatLabel(order.courier_slug)}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {formatLabel(
                            order.shipment?.status ?? "No shipment"
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleOrder(order.id)}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold transition ${
                            isExpanded
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          {isExpanded ? "Close" : "Details"}

                          <svg
                            className={`h-3.5 w-3.5 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <OrderDetails order={order} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile order cards */}
      <div className="space-y-3 md:hidden">
        {filteredOrders.map((order) => {
          const isExpanded = expandedOrder === order.id;

          const productCount = (order.items ?? []).reduce(
            (sum, item) =>
              sum + Number(item.quantity ?? 0),
            0
          );

          return (
            <article
              key={order.id}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.025)] transition hover:shadow-md"
            >
              <div className="space-y-4 p-4">
                {/* Customer and amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-xs font-bold text-blue-700">
                      {getInitials(order.full_name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {order.full_name || "Guest customer"}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {order.phone}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-slate-400">
                        {order.customer_email || "No email"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold tracking-tight text-slate-950">
                      {formatBDT(order.total)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-semibold text-blue-700">
                      #{order.id}
                    </p>
                  </div>
                </div>

                {/* Statuses */}
                <div className="flex flex-wrap gap-2 border-y border-slate-100 py-3">
                  <StatusBadge status={order.status} />
                  <StatusBadge status={order.payment_status} />
                </div>

                {/* Quick info */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Products
                    </p>
                    <p className="mt-1.5 text-xs font-bold text-slate-800">
                      {(order.items ?? []).length}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      {productCount} units
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Payment
                    </p>
                    <p className="mt-1.5 truncate text-xs font-bold text-slate-800">
                      {formatLabel(order.payment_method)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Courier
                    </p>
                    <p className="mt-1.5 truncate text-xs font-bold text-slate-800">
                      {formatLabel(order.courier_slug)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-400">
                    {formatDate(order.created_at)}
                  </p>

                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleOrder(order.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#101b36] px-4 py-2.5 text-[10px] font-bold text-white transition hover:bg-blue-950"
                  >
                    {isExpanded ? "Hide details" : "View details"}

                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>

              {isExpanded && <OrderDetails order={order} />}
            </article>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredOrders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f8faff] px-5 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
          </div>

          <h3 className="mt-4 text-sm font-bold text-slate-800">
            No matching orders
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Try changing your search or filters.
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-[#101b36] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-950"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col justify-between gap-2 border-t border-slate-100 pt-4 text-[10px] text-slate-400 sm:flex-row sm:items-center">
        <p>
          Displaying {filteredOrders.length} of {orders.length} orders
        </p>
        <p>All amounts are displayed in BDT · ৳</p>
      </div>
    </section>
  );
}
