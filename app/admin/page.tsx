
import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/app/account/LogoutButton";

const adminActions = [
  {
    title: "Add Product",
    description: "Add a new product to your store.",
    href: "/admin/products/new",
    icon: "＋",
  },
  {
    title: "Manage Products",
    description: "View, edit and delete products.",
    href: "/admin/products",
    icon: "▦",
  },
  {
    title: "Import Products",
    description: "Import products from a CSV file.",
    href: "/admin/products/import",
    icon: "⇧",
  },
];

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    redirect("/account");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-sm font-medium text-blue-600">
              STORE MANAGEMENT
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            View Store
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10">
        <section className="rounded-2xl bg-slate-900 p-7 text-white sm:p-10">
          <p className="text-sm text-slate-300">Welcome back</p>
          <h2 className="mt-2 text-3xl font-bold">
            {user.email?.split("@")[0] ?? "Admin"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Manage your products and store operations from one place.
          </p>
          <span className="mt-5 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-300">
            Administrator
          </span>
        </section>

        <section className="mt-9">
          <h2 className="text-xl font-bold text-slate-900">
            Product Management
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose an action to manage your store catalog.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {adminActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl font-semibold text-blue-700">
                  {action.icon}
                </span>

                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {action.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {action.description}
                </p>

                <p className="mt-5 text-sm font-semibold text-blue-700 group-hover:underline">
                  Open section →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-6">
          <h2 className="font-semibold text-slate-900">
            Account Information
          </h2>
          <p className="mt-3 break-all text-sm text-slate-600">
            Email: {user.email ?? "Not available"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Role: Administrator
          </p>

          <div className="mt-5">
            <LogoutButton />
          </div>
        </section>
      </div>
    </main>
  );
}
