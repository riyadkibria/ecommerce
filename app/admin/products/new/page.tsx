
import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ImportProductsForm from "./ImportProductsForm";

export default async function ImportProductsPage() {
  const supabase = await createClient();

  // 1. Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. Admin authorization check
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    redirect("/account");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Admin Dashboard
        </Link>

        <header className="mb-8 mt-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Store Management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Import Products
          </h1>

          <p className="mt-2 text-slate-600">
            Fetch demo products from an external API and save
            them to your Supabase database.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <ImportProductsForm />
        </section>
      </div>
    </main>
  );
}
