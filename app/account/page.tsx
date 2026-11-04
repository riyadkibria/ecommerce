import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import LogoutButton from "./LogoutButton";

/* -------------------------------------------------------------------------- */
/*  Icons (inline SVG, no extra dependency)                                   */
/* -------------------------------------------------------------------------- */

type IconName =
  | "grid"
  | "box"
  | "receipt"
  | "users"
  | "settings"
  | "cart"
  | "home"
  | "plus"
  | "edit"
  | "chevron"
  | "external";

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  box: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2.2l2 11h10.3l2-8H6.2" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-7.5 9 7.5" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  external: <path d="M7 17 17 7M8 7h9v9" />,
};

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared style tokens                                                       */
/* -------------------------------------------------------------------------- */

const surface =
  "rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.05] sm:rounded-2xl";

/* -------------------------------------------------------------------------- */
/*  Reusable pieces                                                           */
/* -------------------------------------------------------------------------- */

// Reusable dashboard navigation item (dark sidebar).
function NavLink({
  href,
  icon,
  children,
  active = false,
}: {
  href: string;
  icon: IconName;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-emerald-500/50 md:gap-3 ${
        active
          ? "bg-white font-semibold text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_-10px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/15"
          : "text-slate-600 hover:bg-white/70 hover:text-slate-950"
      }`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500"
        />
      )}

      <span
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
          active
            ? "bg-emerald-50 text-emerald-600"
            : "text-slate-400 group-hover:text-slate-600"
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      {children}
    </Link>
  );
}

// Small group heading in the sidebar.
function NavHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 hidden px-3 text-xs font-medium text-slate-400 md:block">{children}</p>
  );
}

// Reusable overview card for dashboard statistics.
function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: IconName;
  description: string;
}) {
  return (
    <div className={`${surface} p-4 sm:p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-slate-500">{title}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 tabular-nums sm:mt-4 sm:text-3xl">
        {value}
      </p>

      <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

// Compact quick action row.
function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={`${surface} group flex min-h-[76px] items-center gap-3 p-3.5 outline-none transition duration-200 sm:gap-3.5 sm:p-4 hover:-translate-y-px hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_36px_-14px_rgba(16,185,129,0.3)] hover:ring-emerald-300/60 focus-visible:ring-2 focus-visible:ring-emerald-500/60`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition duration-200 group-hover:bg-emerald-500">
        <Icon name={icon} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-slate-950">
          {title}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {description}
        </span>
      </span>

      <Icon
        name="chevron"
        className="h-4 w-4 shrink-0 text-slate-300 transition duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-600"
      />
    </Link>
  );
}

// Colored order status pill.
function StatusBadge({ status }: { status: string | null }) {
  const value = (status ?? "unknown").toLowerCase();

  let styles = "bg-slate-100 text-slate-600 ring-slate-200";
  let dot = "bg-slate-400";

  if (["delivered", "completed", "paid", "fulfilled"].includes(value)) {
    styles = "bg-emerald-50 text-emerald-700 ring-emerald-200";
    dot = "bg-emerald-500";
  } else if (["pending", "processing", "unpaid"].includes(value)) {
    styles = "bg-amber-50 text-amber-700 ring-amber-200";
    dot = "bg-amber-500";
  } else if (["shipped", "in transit", "confirmed"].includes(value)) {
    styles = "bg-sky-50 text-sky-700 ring-sky-200";
    dot = "bg-sky-500";
  } else if (["cancelled", "canceled", "failed", "refunded"].includes(value)) {
    styles = "bg-rose-50 text-rose-700 ring-rose-200";
    dot = "bg-rose-500";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status ?? "unknown"}
    </span>
  );
}

// Section heading used across the dashboard.
function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function AccountPage() {
  // 1. Create Supabase server client using the current session.
  const supabase = await createClient();

  // 2. Verify the logged-in user on the server.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // 3. A visitor without a valid session must log in.
  if (authError || !user) {
    redirect("/login");
  }

  // 4. Read the user's role from the profiles table.
  // This assumes profiles.id stores the matching auth user ID.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // Fail closed: if the role cannot be verified, do not
  // display admin features.
  const isAdmin = !profileError && profile?.role === "admin";

  // 5. Only query store-wide statistics for verified admins.
  let stats = {
    products: 0,
    orders: 0,
    customers: 0,
    pendingOrders: 0,
    processingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalOrderValue: 0,
  };

  let recentOrders: {
    id: string | number;
    full_name: string;
    status: string | null;
    payment_status: string | null;
    total: number | string | null;
    created_at: string | null;
  }[] = [];

  let statsError = false;

  if (isAdmin) {
    const [
      productsResult,
      ordersResult,
      customersResult,
      pendingResult,
      processingResult,
      deliveredResult,
      cancelledResult,
      recentOrdersResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true }),

      // Count only customer profiles, not admin profiles.
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer"),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing"),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered"),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["cancelled", "canceled"]),

      supabase
        .from("orders")
        .select("id, full_name, status, payment_status, total, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Read order totals in pages to avoid the default API row limit.
    // For very large stores, replace this with a protected SQL SUM RPC.
    const allOrderTotals: { total: number | string | null }[] = [];
    let orderValuesError = false;
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("orders")
        .select("total")
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        orderValuesError = true;
        break;
      }

      allOrderTotals.push(...(data ?? []));

      if (!data || data.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    statsError = Boolean(
      productsResult.error ||
        ordersResult.error ||
        customersResult.error ||
        pendingResult.error ||
        processingResult.error ||
        deliveredResult.error ||
        cancelledResult.error ||
        orderValuesError ||
        recentOrdersResult.error
    );

    stats = {
      products: productsResult.count ?? 0,
      orders: ordersResult.count ?? 0,
      customers: customersResult.count ?? 0,
      pendingOrders: pendingResult.count ?? 0,
      processingOrders: processingResult.count ?? 0,
      deliveredOrders: deliveredResult.count ?? 0,
      cancelledOrders: cancelledResult.count ?? 0,
      totalOrderValue: allOrderTotals.reduce(
        (sum, order) => sum + Number(order.total ?? 0),
        0
      ),
    };

    recentOrders = (recentOrdersResult.data ?? []) as typeof recentOrders;
  }

  // 6. Format dates and prices for display.
  const formatMoney = (value: number | string | null) =>
    new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));

  const formatDate = (value: string | null) => {
    if (!value) return "—";

    return new Intl.DateTimeFormat("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const displayName = user.email?.split("@")[0] ?? "there";
  const initial = user.email?.charAt(0).toUpperCase() ?? "U";

  // 7. Render the dashboard.
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F5F8] text-[13px] text-slate-900 antialiased">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        {/* SIDEBAR */}
        <aside className="relative z-20 flex w-full shrink-0 flex-col overflow-hidden border-b border-slate-900/[0.06] bg-gradient-to-b from-[#FBFBFD] via-[#F7F8FB] to-[#F1F3F8] text-slate-600 md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
          {/* Ambient glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl"
          />

          <div className="relative flex h-14 items-center justify-between px-4 sm:px-5 md:h-16">
            <Link
              href="/account"
              className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,0.8)]">
                {isAdmin ? "A" : "S"}
              </div>

              <p className="text-[15px] font-semibold tracking-tight text-slate-950">
                StorePanel
              </p>

              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-inset ring-slate-900/[0.07]">
                {isAdmin ? "Admin" : "Customer"}
              </span>
            </Link>
          </div>

          <div className="relative flex flex-row gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-1 md:flex-col md:space-y-6 md:overflow-visible md:px-3 md:py-4">
            <div className="min-w-0 md:w-full">
              <NavHeading>Workspace</NavHeading>

              <nav className="flex gap-1 md:block md:space-y-1">
                <NavLink href="/account" icon="grid" active>
                  Overview
                </NavLink>

                {isAdmin ? (
                  <>
                    <NavLink href="/admin/products" icon="box">
                      Products
                    </NavLink>

                    <NavLink href="/admin/orders" icon="receipt">
                      Orders
                    </NavLink>

                    <NavLink href="/admin/customers" icon="users">
                      Customers
                    </NavLink>

                    <NavLink href="/admin" icon="settings">
                      Admin panel
                    </NavLink>
                  </>
                ) : (
                  <>
                    <NavLink href="/cart" icon="cart">
                      My cart
                    </NavLink>

                    <NavLink href="/account/orders" icon="receipt">
                      My orders
                    </NavLink>
                  </>
                )}
              </nav>
            </div>

            <div className="min-w-0 md:w-full">
              <NavHeading>Account</NavHeading>

              <nav className="flex gap-1 md:block md:space-y-1">
                <NavLink href="/" icon="home">
                  Visit store
                </NavLink>
              </nav>
            </div>
          </div>

          <div className="relative hidden p-3 md:block">
            <div className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-semibold text-white">
                  {initial}
                </div>

                <p className="min-w-0 truncate text-xs text-slate-600">
                  {user.email ?? "No email available"}
                </p>
              </div>

              <div className="mt-3">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN DASHBOARD */}
        <section className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-900/[0.06] bg-[#F4F5F8]/90 px-4 backdrop-blur-xl sm:h-16 sm:px-8">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-slate-500"
            >
              <span>{isAdmin ? "Store" : "Account"}</span>
              <Icon name="chevron" className="h-3 w-3 text-slate-300" />
              <span className="font-medium text-slate-950">
                {isAdmin ? "Dashboard" : "Overview"}
              </span>
            </nav>

            <Link
              href="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-slate-900/10 outline-none transition duration-200 hover:bg-slate-50 hover:text-slate-950 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <span className="hidden sm:inline">View storefront</span>
              <span className="sm:hidden">Store</span>
              <Icon name="external" className="h-3 w-3 text-slate-400" />
            </Link>
            <div className="ml-2 shrink-0 md:hidden"><LogoutButton /></div>
          </header>

          <div className="mx-auto max-w-6xl space-y-6 p-4 pb-8 sm:space-y-8 sm:p-6 lg:p-8">
            {/* Page heading */}
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-[28px] sm:leading-9">
                  {isAdmin ? "Dashboard" : "My account"}
                </h1>

                <p className="mt-1 text-[13px] text-slate-500">
                  {isAdmin
                    ? `Welcome back, ${displayName}. Manage products, orders and customers.`
                    : `Welcome back, ${displayName}. View your details and shopping tools.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Authenticated
                </span>

                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                  {isAdmin ? "Administrator" : "Customer account"}
                </span>
              </div>
            </div>

            {/* Admin-only statistics */}
            {isAdmin ? (
              <>
                <section className="space-y-4">
                  <SectionHeading
                    title="Store overview"
                    description="Current totals from your database."
                  />

                  {statsError ? (
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 ring-1 ring-inset ring-amber-200/80">
                      Some dashboard data could not be loaded. Check your
                      Supabase queries and Row Level Security policies. The
                      displayed counts may be incomplete.
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                    <Link href="/admin/products" className="block rounded-2xl outline-none transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <StatCard
                        title="Total products"
                        value={stats.products}
                        icon="box"
                        description="Products in your catalog."
                      />
                    </Link>

                    <Link href="/admin/orders" className="block rounded-2xl outline-none transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <StatCard
                        title="Total orders"
                        value={stats.orders}
                        icon="receipt"
                        description="All orders recorded."
                      />
                    </Link>

                    <Link href="/account/profiles" className="block rounded-2xl outline-none transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <StatCard
                        title="Total customers"
                        value={stats.customers}
                        icon="users"
                        description="Profiles with customer role."
                      />
                    </Link>

                    <Link href="/admin/orders" className="block rounded-2xl outline-none transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <StatCard
                        title="Total order value"
                        value={formatMoney(stats.totalOrderValue)}
                        icon="cart"
                        description="Sum of all order totals, not confirmed payments."
                      />
                    </Link>

                    <Link href="/admin/orders" className="block rounded-2xl outline-none transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <StatCard title="Pending orders" value={stats.pendingOrders} icon="receipt" description="Orders awaiting action." />
                    </Link>

                    <Link href="/admin/orders" className="block rounded-2xl outline-none transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <StatCard title="Processing orders" value={stats.processingOrders} icon="receipt" description="Orders being prepared." />
                    </Link>

                    <Link href="/admin/orders" className="block rounded-2xl outline-none transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <StatCard title="Delivered orders" value={stats.deliveredOrders} icon="box" description="Successfully delivered orders." />
                    </Link>

                    <Link href="/admin/orders" className="block rounded-2xl outline-none transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500">
                      <StatCard title="Cancelled orders" value={stats.cancelledOrders} icon="receipt" description="Cancelled or canceled orders." />
                    </Link>
                  </div>
                </section>

                {/* Quick actions */}
                <section className="space-y-4">
                  <SectionHeading
                    title="Quick actions"
                    description="Jump to a common store-management task."
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                    <ActionCard
                      href="/admin/products/new"
                      icon="plus"
                      title="Add a product"
                      description="Create a new product listing."
                    />

                    <ActionCard
                      href="/admin/orders"
                      icon="receipt"
                      title="Manage orders"
                      description="Review and process orders."
                    />

                    <ActionCard
                      href="/admin/products"
                      icon="edit"
                      title="Manage catalog"
                      description="Review and update products."
                    />

                    <ActionCard
                      href="/account/profiles"
                      icon="users"
                      title="Manage customers"
                      description="View customer profiles and accounts."
                    />
                  </div>
                </section>

                {/* Recent orders */}
                <section className="space-y-4">
                  <SectionHeading
                    title="Recent orders"
                    description="The five most recently created orders."
                    action={
                      <Link
                        href="/admin/orders"
                        className="inline-flex items-center gap-1 rounded text-xs font-medium text-emerald-700 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                      >
                        View all
                        <Icon name="chevron" className="h-3 w-3" />
                      </Link>
                    }
                  />

                  <div className={`${surface} overflow-hidden`}>
                    {recentOrders.length > 0 ? (
                      <>
                        {/* Mobile layout: readable order cards, no horizontal scrolling. */}
                        <div className="divide-y divide-slate-100 md:hidden">
                          {recentOrders.map((order) => (
                            <article key={order.id} className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-950">Order #{order.id}</p>
                                  <p className="mt-1 truncate text-xs text-slate-500">{order.full_name || "Customer"}</p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-950">
                                  {formatMoney(order.total)}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={order.status} />
                                <StatusBadge status={order.payment_status} />
                              </div>
                              <p className="text-xs text-slate-500">{formatDate(order.created_at)}</p>
                            </article>
                          ))}
                        </div>

                        {/* Desktop layout: full data table. */}
                        <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[850px] text-left text-[13px]">
                          <thead className="bg-slate-50/80 text-xs text-slate-500">
                            <tr>
                              <th className="px-5 py-3 font-medium">Order</th>
                              <th className="px-5 py-3 font-medium">Customer</th>
                              <th className="px-5 py-3 font-medium">Date</th>
                              <th className="px-5 py-3 font-medium">Order status</th>
                              <th className="px-5 py-3 font-medium">Payment</th>
                              <th className="px-5 py-3 text-right font-medium">Total</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {recentOrders.map((order) => (
                              <tr
                                key={order.id}
                                className="transition duration-150 hover:bg-emerald-50/40"
                              >
                                <td className="px-5 py-3.5 font-semibold text-slate-950">
                                  #{order.id}
                                </td>

                                <td className="px-5 py-3.5 font-medium text-slate-700">
                                  {order.full_name}
                                </td>

                                <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                                  {formatDate(order.created_at)}
                                </td>

                                <td className="px-5 py-3.5">
                                  <StatusBadge status={order.status} />
                                </td>

                                <td className="px-5 py-3.5">
                                  <StatusBadge status={order.payment_status} />
                                </td>

                                <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-950">
                                  {formatMoney(order.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </>
                    ) : (
                      <div className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200">
                          <Icon name="receipt" />
                        </div>

                        <p className="mt-4 text-[13px] font-semibold text-slate-950">
                          No orders yet
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          New orders will appear here when available.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              /* Customer-only view */
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={surface}>
                  <div className="px-5 pb-3 pt-5">
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">
                      Account information
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Your authenticated account details.
                    </p>
                  </div>

                  <dl className="divide-y divide-slate-100 pb-2">
                    <div className="px-5 py-3.5">
                      <dt className="text-xs text-slate-500">Email address</dt>

                      <dd className="mt-1 break-all text-[13px] font-medium text-slate-950">
                        {user.email ?? "No email available"}
                      </dd>
                    </div>

                    <div className="px-5 py-3.5">
                      <dt className="text-xs text-slate-500">User ID</dt>

                      <dd className="mt-1.5 break-all rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs text-slate-600">
                        {user.id}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className={surface}>
                  <div className="px-5 pb-3 pt-5">
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">
                      Shopping shortcuts
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Continue shopping or check your cart.
                    </p>
                  </div>

                  <div className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">
                    <ActionCard
                      href="/"
                      icon="home"
                      title="Browse products"
                      description="Continue shopping in the store."
                    />

                    <ActionCard
                      href="/cart"
                      icon="cart"
                      title="Open my cart"
                      description="Review items before checkout."
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Footer */}
            <footer className="border-t border-slate-900/[0.06] pt-5 text-xs text-slate-400">
              StorePanel · Secure account dashboard
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}