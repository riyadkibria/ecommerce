
import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  UserRound,
  ArrowLeft,
  CalendarDays,
  Hash,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

export default async function ProfilesPage() {
  const supabase = await createClient();

  // 1. Check authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Verify admin role
  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminError || adminProfile?.role !== "admin") {
    redirect("/account");
  }

  // 3. Fetch all profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch profiles");
  }

  const allProfiles = profiles ?? [];

  const adminCount = allProfiles.filter(
    (profile) => profile.role === "admin"
  ).length;

  const customerCount = allProfiles.filter(
    (profile) => profile.role === "customer"
  ).length;

  return (
    <main className="min-h-screen bg-slate-50/80">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Users size={20} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Store Management
              </p>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Profiles
              </h1>
            </div>
          </div>

          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Account</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        {/* Page intro */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
            <Link
              href="/account"
              className="transition hover:text-slate-700"
            >
              Account
            </Link>
            <ChevronRight size={14} />
            <span className="font-medium text-slate-600">Profiles</span>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                User Management
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                View registered customers and administrators, and open an
                account to see its order history.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Admin access
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Profiles"
            value={allProfiles.length}
            description="All registered accounts"
            icon={<Users size={20} />}
            iconStyle="bg-blue-50 text-blue-600"
          />

          <StatCard
            title="Customers"
            value={customerCount}
            description="Registered customer accounts"
            icon={<UserRound size={20} />}
            iconStyle="bg-violet-50 text-violet-600"
          />

          <StatCard
            title="Administrators"
            value={adminCount}
            description="Accounts with admin access"
            icon={<ShieldCheck size={20} />}
            iconStyle="bg-emerald-50 text-emerald-600"
          />
        </div>

        {/* Profiles table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registered Users
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Select an account to view its order history.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <Users size={15} />
              {allProfiles.length} accounts
            </div>
          </div>

          {allProfiles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Registered</th>
                    <th className="px-6 py-4 font-semibold">User ID</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {allProfiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* Clickable user account */}
                      <td className="px-6 py-4">
                        <Link
                          href={`/account/profiles/${profile.id}`}
                          className="group flex items-center gap-3"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              profile.role === "admin"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {(profile.email ?? "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800 transition group-hover:text-blue-600">
                              {profile.email ?? "No email"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400 transition group-hover:text-blue-500">
                              View order history
                            </p>
                          </div>
                        </Link>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                            profile.role === "admin"
                              ? "bg-violet-50 text-violet-700 ring-violet-200"
                              : "bg-blue-50 text-blue-700 ring-blue-200"
                          }`}
                        >
                          {profile.role === "admin" ? (
                            <ShieldCheck size={13} />
                          ) : (
                            <UserRound size={13} />
                          )}
                          {profile.role === "admin" ? "Admin" : "Customer"}
                        </span>
                      </td>

                      {/* Registered date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarDays
                            size={15}
                            className="text-slate-400"
                          />
                          <span>
                            {new Date(profile.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </td>

                      {/* User ID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Hash
                            size={14}
                            className="shrink-0 text-slate-400"
                          />
                          <span
                            title={profile.id}
                            className="max-w-40 truncate font-mono text-xs text-slate-500"
                          >
                            {profile.id}
                          </span>
                        </div>
                      </td>

                      {/* View action */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/account/profiles/${profile.id}`}
                          aria-label={`View orders for ${profile.email ?? "user"}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users size={26} />
              </div>
              <h3 className="font-semibold text-slate-800">
                No profiles found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Registered profiles will appear here when users create
                accounts.
              </p>
            </div>
          )}

          {/* Footer */}
          {allProfiles.length > 0 && (
            <div className="flex flex-col justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:px-6">
              <span>
                Showing {allProfiles.length} registered{" "}
                {allProfiles.length === 1 ? "profile" : "profiles"}
              </span>
              <span>Sorted by newest registration</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  iconStyle,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconStyle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value.toLocaleString()}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconStyle}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">{description}</p>
    </div>
  );
}
