
import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

import DateFilter from "./components/DateFilter";
import OrdersTable from "./components/OrdersTable";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

function getDhakaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function getDhakaDateRange(date: string) {
  const start = new Date(`${date}T00:00:00+06:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function formatReportDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+06:00`));
}

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "orders":
      return (
        <svg {...common}>
          <path d="M8 3h8l4 4v14H4V3h4Z" />
          <path d="M8 3v5h8V3M8 13h8M8 17h5" />
        </svg>
      );

    case "revenue":
      return (
        <svg {...common}>
          <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );

    case "cash":
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <circle cx="12" cy="12" r="3" />
          <path d="M6 9h.01M18 15h.01" />
        </svg>
      );

    case "card":
      return (
        <svg {...common}>
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
          <path d="M2.5 9h19M7 14h3" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function MetricCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: string;
  tone: "blue" | "violet" | "amber" | "cyan" | "green" | "orange";
}) {
  const tones = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      line: "bg-blue-400",
    },
    violet: {
      icon: "bg-violet-50 text-violet-600",
      line: "bg-violet-400",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      line: "bg-amber-400",
    },
    cyan: {
      icon: "bg-cyan-50 text-cyan-700",
      line: "bg-cyan-400",
    },
    green: {
      icon: "bg-emerald-50 text-emerald-600",
      line: "bg-emerald-400",
    },
    orange: {
      icon: "bg-orange-50 text-orange-600",
      line: "bg-orange-400",
    },
  };

  const colors = tones[tone];

  return (
    <article className="min-w-0 rounded-lg border border-slate-200/80 bg-white p-3 transition-colors duration-200 hover:border-slate-300">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-slate-500">
          {label}
        </p>

        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${colors.icon}`}
        >
          <Icon name={icon} className="h-3.5 w-3.5" />
        </div>
      </div>

      <p className="mt-2 truncate text-[22px] font-semibold leading-none tracking-tight text-slate-800">
        {value}
      </p>

      <p className="mt-2 truncate text-[10px] text-slate-400">
        {note}
      </p>

      <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-2/3 rounded-full ${colors.line}`} />
      </div>
    </article>
  );
}

function BreakdownCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: {
    label: string;
    count: number;
    color: string;
  }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="rounded-lg border border-slate-200/80 bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            {title}
          </h3>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {subtitle}
          </p>
        </div>

        <span className="text-[10px] font-medium text-slate-400">
          {total} total
        </span>
      </div>

      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
        {rows.map((row) => (
          <div
            key={row.label}
            className={row.color}
            style={{
              width: `${total ? (row.count / total) * 100 : 0}%`,
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${row.color}`}
            />
            <span className="text-[10px] text-slate-500">
              {row.label}
            </span>
            <span className="text-[10px] font-semibold tabular-nums text-slate-800">
              {row.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    redirect("/account");
  }

  const params = await searchParams;
  const today = getDhakaToday();

  let selectedDate = params.date || today;

  if (!isValidDate(selectedDate) || selectedDate > today) {
    selectedDate = today;
  }

  const { start, end } = getDhakaDateRange(selectedDate);

  const {
    data: ordersData,
    error: ordersError,
  } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Analytics orders error:", ordersError);

    return (
      <main className="min-h-screen bg-[#f8fafc] p-4">
        <div className="mx-auto max-w-7xl rounded-lg border border-red-200 bg-white p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <Icon name="orders" />
          </div>

          <h1 className="mt-3 text-base font-semibold text-slate-900">
            Unable to load analytics
          </h1>

          <p className="mt-1 text-xs text-red-600">
            {ordersError.message}
          </p>
        </div>
      </main>
    );
  }

  const orders = ordersData || [];
  const orderIds = orders.map((order) => order.id);

  const userIds = [
    ...new Set(
      orders
        .map((order) => order.user_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let orderItems: any[] = [];
  let shipments: any[] = [];
  let profiles: any[] = [];

  if (orderIds.length > 0) {
    const [itemsResult, shipmentsResult] = await Promise.all([
      supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds),

      supabase
        .from("shipments")
        .select("*")
        .in("order_id", orderIds),
    ]);

    if (itemsResult.error) {
      console.error("Order items error:", itemsResult.error);
    } else {
      orderItems = itemsResult.data || [];
    }

    if (shipmentsResult.error) {
      console.error("Shipment error:", shipmentsResult.error);
    } else {
      shipments = shipmentsResult.data || [];
    }
  }

  if (userIds.length > 0) {
    const profilesResult = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profilesResult.error) {
      console.error("Profiles error:", profilesResult.error);
    } else {
      profiles = profilesResult.data || [];
    }
  }

  const tableOrders = orders.map((order) => {
    const customer = profiles.find(
      (profile) => profile.id === order.user_id
    );

    const shipment = shipments.find(
      (item) => item.order_id === order.id
    );

    const items = orderItems.filter(
      (item) => item.order_id === order.id
    );

    return {
      ...order,
      customerEmail: customer?.email || "",
      shipment: shipment || null,
      items,
    };
  });

  const totalOrders = orders.length;

  const grossOrderValue = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const codOrders = orders.filter(
    (order) => order.payment_method === "cod"
  ).length;

  const onlineOrders = orders.filter(
    (order) => order.payment_method !== "cod"
  ).length;

  const paidOrders = orders.filter(
    (order) => order.payment_status === "paid"
  ).length;

  const pendingOrders = orders.filter(
    (order) =>
      ["pending", "unpaid"].includes(
        (order.payment_status || "").toLowerCase()
      )
  ).length;

  const stats = [
    {
      label: "Total orders",
      value: totalOrders,
      note: "Orders received on this date",
      icon: "orders",
      tone: "blue" as const,
    },
    {
      label: "Gross order value",
      value: `৳${grossOrderValue.toLocaleString("en-BD")}`,
      note: "Total value of all orders",
      icon: "revenue",
      tone: "violet" as const,
    },
    {
      label: "Cash on delivery",
      value: codOrders,
      note: "COD payment method",
      icon: "cash",
      tone: "amber" as const,
    },
    {
      label: "Online payments",
      value: onlineOrders,
      note: "Non-COD payment method",
      icon: "card",
      tone: "cyan" as const,
    },
    {
      label: "Paid orders",
      value: paidOrders,
      note: "Payment completed",
      icon: "check",
      tone: "green" as const,
    },
    {
      label: "Pending payments",
      value: pendingOrders,
      note: "Awaiting payment",
      icon: "clock",
      tone: "orange" as const,
    },
  ];

  const formattedDate = formatReportDate(selectedDate);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800">
      <div className="mx-auto max-w-[1600px] space-y-4 p-3 sm:p-4 lg:p-5">

        {/* Header */}
        <section className="rounded-lg border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Store intelligence
                </p>
              </div>

              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                Order analytics
              </h1>

              <p className="mt-0.5 text-[11px] text-slate-500">
                Monitor orders, revenue and payment performance.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <Icon name="orders" className="h-3.5 w-3.5" />
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-400">
                  Report date
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            <div>
              <p className="text-[10px] text-slate-400">Total orders</p>
              <p className="mt-0.5 text-base font-semibold text-slate-800">
                {totalOrders.toLocaleString("en-BD")}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-slate-400">Order value</p>
              <p className="mt-0.5 break-words text-base font-semibold text-slate-800">
                ৳{grossOrderValue.toLocaleString("en-BD")}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-slate-400">Paid percentage</p>
              <p className="mt-0.5 text-base font-semibold text-emerald-600">
                {totalOrders
                  ? Math.round((paidOrders / totalOrders) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </section>

        {/* Date filter */}
        <DateFilter selectedDate={selectedDate} today={today} />

        {/* KPI cards */}
        <section>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-700">
              Performance overview
            </h2>

            <span className="text-[10px] text-slate-400">
              {formattedDate}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
            {stats.map((stat) => (
              <MetricCard key={stat.label} {...stat} />
            ))}
          </div>
        </section>

        {/* Payment breakdown */}
        <section className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          <BreakdownCard
            title="Payment methods"
            subtitle="Customer payment preference"
            rows={[
              {
                label: "Cash on delivery",
                count: codOrders,
                color: "bg-amber-400",
              },
              {
                label: "Online payment",
                count: onlineOrders,
                color: "bg-blue-400",
              },
            ]}
          />

          <BreakdownCard
            title="Payment status"
            subtitle="Payment completion overview"
            rows={[
              {
                label: "Paid",
                count: paidOrders,
                color: "bg-emerald-400",
              },
              {
                label: "Pending / unpaid",
                count: pendingOrders,
                color: "bg-amber-400",
              },
              {
                label: "Other statuses",
                count: Math.max(
                  0,
                  totalOrders - paidOrders - pendingOrders
                ),
                color: "bg-slate-300",
              },
            ]}
          />
        </section>

        {/* Orders */}
        <section className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-3.5 py-3 sm:flex-row sm:items-center sm:px-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-slate-800">
                  Order management
                </h2>

                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                  {totalOrders}
                </span>
              </div>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Customer, payment and fulfillment details.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Report loaded
            </div>
          </div>

          <div className="p-2.5 sm:p-3">
            <OrdersTable orders={tableOrders as any[]} />
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-1 pb-2 text-[10px] text-slate-400 sm:flex-row">
          <span>Store analytics dashboard</span>
          <span>Bangladesh Standard Time · UTC+6</span>
        </footer>
      </div>
    </main>
  );
}
