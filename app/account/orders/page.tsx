
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

type Order = {
  id: number | string;
  status: string | null;
  total: number | string | null;
  created_at: string | null;
};

type Shipment = {
  order_id: number | string;
  tracking_number: string | null;
  status: string | null;
};

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ status }: { status: string | null }) {
  const value = (status ?? "unknown").toLowerCase();

  let color = "bg-slate-100 text-slate-700";

  if (["delivered", "completed"].includes(value)) {
    color = "bg-emerald-100 text-emerald-800";
  } else if (["pending", "processing"].includes(value)) {
    color = "bg-amber-100 text-amber-800";
  } else if (
    ["shipped", "in transit", "confirmed"].includes(value)
  ) {
    color = "bg-sky-100 text-sky-800";
  } else if (
    ["cancelled", "canceled", "failed", "refunded"].includes(value)
  ) {
    color = "bg-rose-100 text-rose-800";
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium capitalize ${color}`}
    >
      {status ?? "Unknown"}
    </span>
  );
}

function TrackOrderButton({
  orderId,
}: {
  orderId: number | string;
}) {
  return (
    <Link
      href={`/account/orders/${orderId}/tracking`}
      className="
        group inline-flex items-center justify-center gap-2
        whitespace-nowrap rounded-lg
        border border-[#303A34]
        bg-[#202824]
        px-4 py-2.5
        text-sm font-medium text-[#E5EDE8]
        shadow-sm
        transition-all duration-200 ease-out
        hover:border-[#3E5948]
        hover:bg-[#26352C]
        hover:text-white
        hover:shadow-[0_0_0_3px_rgba(62,207,142,0.08)]
        active:scale-[0.98]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[#3ECF8E]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-white
      "
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-[17px] w-[17px] shrink-0 text-[#3ECF8E] transition-transform duration-200 group-hover:-translate-y-0.5"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path
          d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="18" r="1.5" />
        <circle cx="17.5" cy="18" r="1.5" />
      </svg>

      <span>Track order</span>

      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4 shrink-0 text-[#89978E] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#3ECF8E]"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="m9 18 6-6-6-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

export default async function MyOrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = (data ?? []) as Order[];

  let shipments: Shipment[] = [];
  let shipmentError = false;

  if (!error && orders.length > 0) {
    const orderIds = orders.map((order) => order.id);

    const result = await supabase
      .from("shipments")
      .select("order_id, tracking_number, status")
      .in("order_id", orderIds);

    if (result.error) {
      shipmentError = true;
    } else {
      shipments = (result.data ?? []) as Shipment[];
    }
  }

  const shipmentByOrder = new Map(
    shipments.map((shipment) => [
      String(shipment.order_id),
      shipment,
    ])
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* Page heading */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              My account
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              My orders
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View your orders and track your shipments.
            </p>
          </div>

          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:border-slate-300 hover:bg-slate-100"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="m15 18-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to account
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            <p className="font-semibold">
              Could not load your orders.
            </p>
            <p className="mt-1">
              Check your orders table columns and Supabase RLS policies.
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path
                  d="M4 5h16v15H4zM8 5V3h8v2M8 10h8M8 14h5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Your orders will appear here after you place an order while logged in.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Order history
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Your recent purchases
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {orders.length} orders
              </span>
            </div>

            {shipmentError && (
              <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                Shipment information could not be loaded.
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50/80 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Order ID
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Date
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Order status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Shipment
                    </th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Total
                    </th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const shipment = shipmentByOrder.get(
                      String(order.id)
                    );

                    const canTrack = Boolean(
                      shipment?.tracking_number
                    );

                    return (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-5 font-semibold text-slate-900">
                          #{order.id}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                          {formatDate(order.created_at)}
                        </td>

                        <td className="px-5 py-5">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="px-5 py-5">
                          {shipment ? (
                            <StatusBadge status={shipment.status} />
                          ) : (
                            <span className="whitespace-nowrap text-xs text-slate-400">
                              Not shipped yet
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-right font-semibold text-slate-900">
                          {formatMoney(order.total)}
                        </td>

                        <td className="px-5 py-5 text-right">
                          {canTrack ? (
                            <TrackOrderButton orderId={order.id} />
                          ) : (
                            <span
                              title="Tracking becomes available when a courier tracking ID is assigned."
                              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-[17px] w-[17px]"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              >
                                <path
                                  d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="7.5" cy="18" r="1.5" />
                                <circle cx="17.5" cy="18" r="1.5" />
                              </svg>
                              Track order
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
