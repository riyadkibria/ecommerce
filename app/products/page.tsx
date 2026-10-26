
import { Suspense } from "react";
import { createClient } from "@/app/lib/supabase/server";
import ProductsClient from "./ProductsClient";

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-50 px-4 py-10">
          <div className="mx-auto max-w-7xl animate-pulse">
            <div className="mb-6 h-8 w-48 rounded bg-neutral-200" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="h-64 rounded-2xl bg-neutral-200"
                />
              ))}
            </div>
          </div>
        </main>
      }
    >
      <ProductsContent />
    </Suspense>
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
    <main className="min-h-screen bg-neutral-50">
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
