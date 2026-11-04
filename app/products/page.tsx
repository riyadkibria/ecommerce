import { Suspense } from "react";
import { createClient } from "@/app/lib/supabase/server";
import ProductsClient from "./ProductsClient";

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}

// Loading state that mirrors the compact layout of the products page.
function ProductsSkeleton() {
  return (
    <main
      className="min-h-screen bg-slate-50/60 text-[13px] text-slate-900 antialiased"
      aria-busy="true"
      aria-label="Loading products"
    >
      {/* Top bar */}
      <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-6">
        <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-slate-100" />
      </div>

      <div className="mx-auto max-w-7xl space-y-5 p-5 sm:p-6">
        {/* Page heading */}
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-full max-w-xs animate-pulse rounded-md border border-slate-200 bg-white" />
          <div className="h-8 w-28 animate-pulse rounded-md border border-slate-200 bg-white" />
          <div className="h-8 w-24 animate-pulse rounded-md border border-slate-200 bg-white" />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-slate-100" />

              <div className="space-y-2 p-3">
                <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

async function ProductsContent() {
  const supabase = await createClient();

  const [
    { data: products, error: productsError, count },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("id", { ascending: false })
      .range(0, 11),

    supabase
      .from("categories")
      .select("id, name")
      .order("name"),
  ]);

  if (productsError) {
    console.error("Products query failed:", productsError.message);
  }

  if (categoriesError) {
    console.error("Categories query failed:", categoriesError.message);
  }

  return (
    <main className="min-h-screen bg-slate-50/60 text-[13px] text-slate-900 antialiased">
      <ProductsClient
        initialProducts={(products ?? []) as Product[]}
        initialTotal={count ?? 0}
        categories={(categories ?? []) as Category[]}
        initialError={productsError ? "Could not load products." : ""}
      />
    </main>
  );
}

export type Product = {
  id: number | string;
  title?: string | null;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  brand?: string | null;
  image?: string | null;
  category?: string | null;
  category_id?: string | null;
};

export type Category = {
  id: string;
  name: string;
};