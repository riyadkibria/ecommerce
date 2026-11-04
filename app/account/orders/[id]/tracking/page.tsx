
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import LiveTracking from "./LiveTracking";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TrackingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Ensure this order belongs to the logged-in customer.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-slate-600">
          Could not load this order. Please try again.
        </p>

        <Link
          href="/account/orders"
          className="mt-4 inline-block font-medium text-blue-600 hover:underline"
        >
          ← Back to my orders
        </Link>
      </main>
    );
  }

  if (!order) {
    notFound();
  }

  // Get this order's shipment and tracking ID.
  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select("tracking_number, status, courier_id")
    .eq("order_id", order.id)
    .maybeSingle();

  // Resolve the courier name from the couriers table.
  let courierName = "Delivery partner";

  if (shipment?.courier_id) {
    const { data: courier } = await supabase
      .from("couriers")
      .select("name, slug")
      .eq("id", shipment.courier_id)
      .maybeSingle();

    if (courier?.name) {
      courierName = courier.name;
    }
  }

  const trackingId = shipment?.tracking_number;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-blue-700"
        >
          <span aria-hidden="true">←</span>
          Back to my orders
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 px-6 py-7 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Order details
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Track your shipment
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Order #{order.id}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6"
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
              </div>
            </div>
          </div>

          <div className="space-y-7 p-6 sm:p-8">
            {/* Tracking ID card */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-700">
                  Tracking ID
                </h2>

                {trackingId ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ID available
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Awaiting tracking ID
                  </span>
                )}
              </div>

              {shipmentError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Could not load shipment details. Please refresh the page.
                </div>
              ) : trackingId ? (
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        {courierName}
                      </p>

                      <p className="mt-1 break-all font-mono text-lg font-bold tracking-wide text-slate-900 sm:text-xl">
                        {trackingId}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Keep this ID for shipment reference.
                      </p>
                    </div>

                    <button
                      type="button"
                      data-copy-tracking={trackingId}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 active:translate-y-0"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect
                          x="8"
                          y="8"
                          width="12"
                          height="12"
                          rx="2"
                        />
                        <path
                          d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"
                          strokeLinecap="round"
                        />
                      </svg>
                      Copy Tracking ID
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                  <p className="font-medium text-slate-700">
                    Tracking ID is not available yet.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    The courier tracking number will appear here once it is
                    assigned to your shipment.
                  </p>
                </div>
              )}

              {shipment?.status && (
                <p className="mt-3 text-sm text-slate-500">
                  Shipment record status:{" "}
                  <span className="font-medium capitalize text-slate-700">
                    {shipment.status.replaceAll("_", " ")}
                  </span>
                </p>
              )}
            </section>

            <div className="h-px bg-slate-100" />

            {/* Live tracking */}
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Live shipment updates
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Check the latest tracking information from the courier.
                </p>
              </div>

              <LiveTracking orderId={String(order.id)} />
            </section>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Shipment information is provided by your delivery partner.
        </p>
      </div>

      {/* Copy tracking ID without adding another client component */}
      {trackingId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.querySelectorAll('[data-copy-tracking]').forEach(function(button) {
                if (button.dataset.copyReady) return;
                button.dataset.copyReady = 'true';
                button.addEventListener('click', async function() {
                  var trackingId = button.getAttribute('data-copy-tracking');
                  var originalText = button.innerText;
                  try {
                    await navigator.clipboard.writeText(trackingId);
                    button.innerText = 'Copied!';
                    setTimeout(function() {
                      button.innerText = originalText;
                    }, 1500);
                  } catch {
                    button.innerText = 'Copy failed';
                    setTimeout(function() {
                      button.innerText = originalText;
                    }, 1500);
                  }
                });
              });
            `,
          }}
        />
      )}
    </main>
  );
}
