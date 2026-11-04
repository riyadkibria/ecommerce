
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/app/lib/supabase/server";
import ClearPaidCart from "./ClearPaidCart";
import TrackingStatus from "./TrackingStatus";

type Order = {
  id: number;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  address_line: string | null;
  courier_slug: string | null;
  subtotal: number | string;
  shipping_cost: number | string;
  tax: number | string;
  total: number | string;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
  created_at: string | null;
};

type OrderItem = {
  id: number;
  product_title: string | null;
  quantity: number;
  price: number | string;
};

type Shipment = {
  tracking_number: string | null;
  status: string | null;
};

function Money({
  value,
  className = "",
}: {
  value: number | string | null | undefined;
  className?: string;
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      <span className="mr-0.5 font-normal opacity-50">৳</span>
      {Number(value ?? 0).toLocaleString("en-BD", {
        maximumFractionDigits: 2,
      })}
    </span>
  );
}

function pretty(value: string | null | undefined) {
  if (!value) return "Pending";

  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value: string | null) {
  if (!value) return "Recently placed";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently placed";

  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/* -------------------------------------------------------------------------- */
/* Shared style tokens                                                        */
/* -------------------------------------------------------------------------- */

const primaryButton =
  "inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.2),0_8px_16px_-8px_rgba(15,23,42,0.5)] outline-none transition duration-200 hover:bg-slate-800 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2";

const secondaryButton =
  "inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-slate-900/10 outline-none transition duration-200 hover:bg-slate-50 hover:text-slate-950 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2";

const card =
  "overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.05]";

const cardHeader = "px-5 pb-1 pt-5";

const cardTitle = "text-[15px] font-semibold tracking-tight text-slate-950";

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-3">
      <dt className="shrink-0 text-[13px] text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right text-[13px] font-medium text-slate-900">
        {children}
      </dd>
    </div>
  );
}

function MessagePage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-[70vh] items-start justify-center bg-[#F6F7F9] px-4 pb-16 pt-14 text-[13px] text-slate-900 antialiased sm:pt-24">
      <section className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.05]">
        <div className="flex items-start gap-3.5 px-5 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/80">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5M12 16.5h.01" />
            </svg>
          </span>

          <div className="min-w-0 pt-0.5">
            <h1 className="text-[15px] font-semibold leading-5 tracking-tight text-slate-950">
              {title}
            </h1>

            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 bg-slate-50/80 px-4 py-3">
          <Link href="/account" className={secondaryButton}>
            My account
          </Link>

          <Link href="/" className={primaryButton}>
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  console.log("[ORDER SUCCESS] Page opened:", {
    orderId: id,
    timestamp: new Date().toISOString(),
  });

  if (!/^[1-9]\d*$/.test(id)) {
    console.error("[ORDER SUCCESS] Invalid order ID:", id);

    return (
      <MessagePage
        title="Invalid order number"
        message="The order number in this URL is invalid."
      />
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("[ORDER SUCCESS] Authentication:", {
    authenticated: !!user,
    userId: user?.id ?? null,
    authError: authError?.message ?? null,
  });

  if (authError || !user) {
    return (
      <MessagePage
        title="Please sign in"
        message="Sign in with the account used to place this order, then open the order confirmation again."
      />
    );
  }

  console.log("[ORDER SUCCESS] Loading order:", {
    orderId: id,
    userId: user.id,
  });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, user_id, full_name, phone, city, address_line, courier_slug, subtotal, shipping_cost, tax, total, payment_method, payment_status, status, created_at"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Order>();

  console.log("[ORDER SUCCESS] Order query result:", {
    orderId: order?.id ?? null,
    found: !!order,
    status: order?.status ?? null,
    paymentStatus: order?.payment_status ?? null,
    error: orderError?.message ?? null,
  });

  if (orderError) {
    console.error("[ORDER SUCCESS] Order query failed:", orderError);

    return (
      <MessagePage
        title="Could not load order"
        message="There was a problem reading your order. Check the server terminal for the Supabase error."
      />
    );
  }

  if (!order) {
    console.error(
      `[ORDER SUCCESS] No accessible order found for ID ${id} and user ${user.id}.`
    );

    return (
      <MessagePage
        title="Order not found"
        message="This order could not be found for your signed-in account. Check the order ID and your Supabase orders SELECT policy."
      />
    );
  }

  console.log("[ORDER SUCCESS] Loading order items and shipment:", {
    orderId: order.id,
  });

  const [
    { data: items, error: itemsError },
    { data: shipment, error: shipmentError },
  ] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, product_title, quantity, price")
      .eq("order_id", order.id)
      .returns<OrderItem[]>(),

    supabase
      .from("shipments")
      .select("tracking_number, status")
      .eq("order_id", order.id)
      .limit(1)
      .maybeSingle<Shipment>(),
  ]);

  console.log("[ORDER SUCCESS] Related data:", {
    orderId: order.id,
    itemCount: items?.length ?? 0,
    itemsError: itemsError?.message ?? null,
    shipmentFound: !!shipment,
    trackingNumber: shipment?.tracking_number ?? null,
    shipmentStatus: shipment?.status ?? null,
    shipmentError: shipmentError?.message ?? null,
  });

  if (itemsError) {
    console.error("[ORDER SUCCESS] Items query failed:", itemsError);
  }

  if (shipmentError) {
    console.error("[ORDER SUCCESS] Shipment query failed:", shipmentError);
  }

  const orderItems = items ?? [];
  const status = (order.status ?? "pending").toLowerCase();

  const cancelled = ["cancelled", "canceled", "failed"].includes(status);
  const delivered = status === "delivered";

  const courier =
    order.courier_slug === "redx"
      ? "REDX"
      : order.courier_slug === "steadfast"
        ? "Steadfast"
        : pretty(order.courier_slug);

  const statusStyle = cancelled
    ? {
        pill: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
        dot: "bg-rose-400",
      }
    : delivered
      ? {
          pill: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
          dot: "bg-emerald-400",
        }
      : {
          pill: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
          dot: "bg-amber-400",
        };

  console.log("[ORDER SUCCESS] Page data ready:", {
    orderId: order.id,
    itemCount: orderItems.length,
    cancelled,
    delivered,
    courier,
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F6F7F9] text-[13px] text-slate-900 antialiased">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b ${
          cancelled ? "from-rose-100/60" : "from-emerald-100/60"
        } to-transparent`}
      />

      <ClearPaidCart
        paymentMethod={order.payment_method}
        paymentStatus={order.payment_status}
      />

      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        {/* Header */}
        <header className="mb-8 flex items-center gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_8px_20px_-8px] ring-1 ring-inset ${
              cancelled
                ? "bg-rose-50 text-rose-600 shadow-rose-300 ring-rose-200"
                : "bg-emerald-50 text-emerald-600 shadow-emerald-300 ring-emerald-200"
            }`}
          >
            {cancelled ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5M12 16.5h.01" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
          </span>

          <div className="min-w-0">
            <p className="text-[13px] text-slate-500">
              Order confirmation
            </p>

            <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-[28px] sm:leading-9">
              {cancelled ? "Order status update" : "Thank you for your order!"}
            </h1>

            <p className="mt-0.5 text-[13px] text-slate-500">
              Your order details are shown below.
            </p>
          </div>
        </header>

        {/* Order number and status */}
        <section className="relative mb-5 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-[0_1px_2px_rgba(15,23,42,0.2),0_20px_40px_-20px_rgba(15,23,42,0.6)] sm:px-6 sm:py-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl"
          />

          <div className="relative flex items-center gap-5 sm:gap-7">
            <div>
              <p className="text-xs text-slate-400">Order number</p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                #{order.id}
              </p>
            </div>

            <span aria-hidden="true" className="h-9 w-px bg-white/10" />

            <div>
              <p className="text-xs text-slate-400">Placed</p>
              <p className="mt-1 text-[13px] font-medium text-slate-100">
                {dateLabel(order.created_at)}
              </p>
            </div>
          </div>

          <span
            className={`relative inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle.pill}`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
            />
            {pretty(order.status)}
          </span>
        </section>

        {/* Main layout */}
        <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* LEFT: Order summary */}
          <section className={`${card} min-w-0`}>
            <div className={cardHeader}>
              <h2 className={cardTitle}>Order summary</h2>
            </div>

            {orderItems.length > 0 ? (
              <ul className="mt-2 divide-y divide-slate-100 px-5">
                {orderItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-[13px] font-medium leading-5 text-slate-900">
                        {item.product_title || "Product"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Qty: {item.quantity} × <Money value={item.price} />
                      </p>
                    </div>

                    <p className="shrink-0 text-[13px] font-semibold text-slate-950">
                      <Money
                        value={Number(item.price) * item.quantity}
                      />
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-[13px] text-slate-500">
                {itemsError
                  ? "Could not load the order items."
                  : "No order items were found."}
              </p>
            )}

            <div className="mt-2 space-y-2.5 bg-slate-50/80 px-5 py-4 text-[13px]">
              <div className="flex justify-between gap-4 text-slate-500">
                <span>Subtotal</span>
                <Money value={order.subtotal} className="text-slate-900" />
              </div>

              <div className="flex justify-between gap-4 text-slate-500">
                <span>Delivery charge</span>
                <Money value={order.shipping_cost} className="text-slate-900" />
              </div>

              {Number(order.tax) !== 0 && (
                <div className="flex justify-between gap-4 text-slate-500">
                  <span>Tax</span>
                  <Money value={order.tax} className="text-slate-900" />
                </div>
              )}

              <div className="flex items-center justify-between gap-4 border-t border-dashed border-slate-300/80 pt-3.5">
                <span className="text-sm font-semibold text-slate-950">
                  Total
                </span>

                <Money
                  value={order.total}
                  className="text-2xl font-semibold tracking-tight text-slate-950"
                />
              </div>
            </div>
          </section>

          {/* RIGHT: Delivery, shipping and payment */}
          <div className="flex min-w-0 flex-col gap-5">
            <section className={`${card} pb-2`}>
              <div className={cardHeader}>
                <h2 className={cardTitle}>Delivery details</h2>
              </div>

              <dl className="mt-1 divide-y divide-slate-100">
                <InfoRow label="Recipient">
                  {order.full_name || "Not provided"}
                </InfoRow>

                <InfoRow label="Phone">
                  <span className="tabular-nums">
                    {order.phone || "Not provided"}
                  </span>
                </InfoRow>

                <InfoRow label="Address">
                  <span className="font-normal leading-5 text-slate-700">
                    {[order.address_line, order.city]
                      .filter(Boolean)
                      .join(", ") || "Not provided"}
                  </span>
                </InfoRow>
              </dl>
            </section>

            <section className={`${card} pb-2`}>
              <div className={cardHeader}>
                <h2 className={cardTitle}>Shipping & payment</h2>
              </div>

              <dl className="mt-1 divide-y divide-slate-100">
                <InfoRow label="Courier">{courier}</InfoRow>

                <InfoRow label="Payment">
                  {pretty(order.payment_method)}
                </InfoRow>

                <InfoRow label="Payment status">
                  {pretty(order.payment_status)}
                </InfoRow>

                <InfoRow label="Tracking number">
                  {shipment?.tracking_number &&
                  order.courier_slug === "redx" ? (
                    <TrackingStatus
                      orderId={order.id}
                      trackingNumber={shipment.tracking_number}
                      initialStatus={shipment.status}
                    />
                  ) : (
                    <span className="break-all rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs tabular-nums text-slate-800">
                      {shipment?.tracking_number || "Not available yet"}
                    </span>
                  )}
                </InfoRow>

                {shipment?.status && (
                  <InfoRow label="Saved shipment status">
                    {pretty(shipment.status)}
                  </InfoRow>
                )}
              </dl>

              {shipmentError && (
                <p className="mx-5 mb-3 mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-200/70">
                  Shipment information could not be loaded.
                </p>
              )}
            </section>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {!cancelled && (
            <a
              href={`/api/orders/${order.id}/invoice`}
              className={primaryButton}
              download
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12 3v12m-5-5 5 5 5-5" />
                <path d="M5 17v3h14v-3" />
              </svg>
              Download Invoice (PDF)
            </a>
          )}

          <Link href="/" className={secondaryButton}>
            Continue shopping
          </Link>

          <Link href="/account" className={secondaryButton}>
            My account
          </Link>
        </div>
      </div>
    </main>
  );
}
