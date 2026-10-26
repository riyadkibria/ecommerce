
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";

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

function money(value: number | string | null | undefined) {
  return `৳${Number(value ?? 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
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

function MessagePage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl">
          !
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {message}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Home
          </Link>

          <Link
            href="/account"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            My account
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

  if (!/^[1-9]\d*$/.test(id)) {
    return (
      <MessagePage
        title="Invalid order number"
        message="The order number in this URL is invalid."
      />
    );
  }

  const supabase = await createClient();

  // Get the currently logged-in user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <MessagePage
        title="Please sign in"
        message="Sign in with the account used to place this order, then open the order confirmation again."
      />
    );
  }

  // Only load an order belonging to this user.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, user_id, full_name, phone, city, address_line, courier_slug, subtotal, shipping_cost, tax, total, payment_method, payment_status, status, created_at"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Order>();

  if (orderError) {
    console.error("[ORDER SUCCESS] Order query:", orderError);

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

  if (itemsError) {
    console.error("[ORDER SUCCESS] Items query:", itemsError);
  }

  if (shipmentError) {
    console.error("[ORDER SUCCESS] Shipment query:", shipmentError);
  }

  const orderItems = items ?? [];
  const status = (order.status ?? "pending").toLowerCase();
  const cancelled = ["cancelled", "canceled", "failed"].includes(status);

  const courier =
    order.courier_slug === "redx"
      ? "REDX"
      : order.courier_slug === "steadfast"
        ? "Steadfast"
        : pretty(order.courier_slug);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${
              cancelled
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {cancelled ? "!" : "✓"}
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-indigo-600">
            Order confirmation
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {cancelled ? "Order status update" : "Thank you for your order!"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Your order details are shown below.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <p className="text-xs text-slate-500">Order number</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">
                #{order.id}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {dateLabel(order.created_at)}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                cancelled
                  ? "bg-red-50 text-red-700"
                  : status === "delivered"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-800"
              }`}
            >
              {pretty(order.status)}
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">Order summary</h2>

            {orderItems.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-100">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-800">
                        {item.product_title || "Product"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Qty: {item.quantity} × {money(item.price)}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-bold text-slate-900">
                      {money(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {itemsError
                  ? "Could not load the order items."
                  : "No order items were found."}
              </p>
            )}

            <div className="my-5 border-t border-dashed border-slate-200" />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 text-slate-600">
                <span>Subtotal</span>
                <span>{money(order.subtotal)}</span>
              </div>

              <div className="flex justify-between gap-4 text-slate-600">
                <span>Delivery charge</span>
                <span>{money(order.shipping_cost)}</span>
              </div>

              {Number(order.tax) !== 0 && (
                <div className="flex justify-between gap-4 text-slate-600">
                  <span>Tax</span>
                  <span>{money(order.tax)}</span>
                </div>
              )}

              <div className="flex justify-between gap-4 border-t border-slate-100 pt-4">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-xl font-extrabold text-indigo-700">
                  {money(order.total)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Delivery details</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Recipient</p>
                <p className="mt-1 font-medium text-slate-800">
                  {order.full_name || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="mt-1 font-medium text-slate-800">
                  {order.phone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="mt-1 break-words text-slate-700">
                  {[order.address_line, order.city]
                    .filter(Boolean)
                    .join(", ") || "Not provided"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Shipping & payment</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Courier</span>
                <span className="text-right font-semibold">
                  {courier}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Payment</span>
                <span className="text-right font-semibold">
                  {pretty(order.payment_method)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Payment status</span>
                <span className="text-right font-semibold">
                  {pretty(order.payment_status)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">Tracking number</p>

                <p className="mt-1 break-all font-bold text-indigo-700">
                  {shipment?.tracking_number || "Not available yet"}
                </p>

                {shipment?.status && (
                  <p className="mt-1 text-xs text-slate-500">
                    Shipment status: {pretty(shipment.status)}
                  </p>
                )}

                {shipmentError && (
                  <p className="mt-1 text-xs text-amber-700">
                    Shipment information could not be loaded.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex flex-1 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Continue shopping
          </Link>

          <Link
            href="/account"
            className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            My account
          </Link>
        </div>
      </div>
    </main>
  );
}
