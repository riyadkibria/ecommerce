
"use server";

import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ImportProductsState = {
  error?: string;
  message?: string;
};

type FakeProduct = {
  id: number;
  title: string;
  price: number;
  description: string;
  image: string;
  category?: string;
};

export async function importFakeProducts(
  _previousState: ImportProductsState1,
  _formData: FormData
): Promise<ImportProductsState1> {
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
    return {
      error: "You are not authorized to import products.",
    };
  }

  // 3. Fetch products from Fake Store API
  let products: FakeProduct[];

  try {
    const response = await fetch(
      "https://fakestoreapi.com/products",
      { cache: "no-store" }
    );

    if (!response.ok) {
      return {
        error: "Could not fetch products from Fake Store API.",
      };
    }

    products = (await response.json()) as FakeProduct[];
  } catch {
    return {
      error: "Network error while fetching products.",
    };
  }

  if (!Array.isArray(products) || products.length === 0) {
    return {
      error: "No products were returned by the API.",
    };
  }

  // 4. Validate and map API data to our database schema
  const rows = [];

  for (const product of products) {
    if (
      !Number.isSafeInteger(product.id) ||
      product.id <= 0 ||
      typeof product.title !== "string" ||
      !product.title.trim() ||
      typeof product.price !== "number" ||
      !Number.isFinite(product.price) ||
      product.price <= 0 ||
      typeof product.description !== "string" ||
      typeof product.image !== "string"
    ) {
      return {
        error: "The API returned invalid product data.",
      };
    }

    let imageUrl: URL;

    try {
      imageUrl = new URL(product.image);
    } catch {
      return {
        error: "The API returned an invalid product image URL.",
      };
    }

    if (imageUrl.protocol !== "https:") {
      return {
        error: "The API returned an image URL that is not HTTPS.",
      };
    }

    rows.push({
      external_id: product.id,
      title: product.title.trim().slice(0, 200),
      description: product.description.slice(0, 10000),
      price: product.price,
      image: product.image,
      brand: null,
      stock: 10,
    });
  }

  // 5. Insert products into Supabase.
  // Existing external_id values are skipped on repeated imports.
  const { error: insertError } = await supabase
    .from("products")
    .upsert(rows, {
      onConflict: "external_id",
      ignoreDuplicates: true,
    });

  if (insertError) {
    console.error("Fake product import failed:", insertError.message);

    return {
      error:
        "Import failed. Check the products table, column types, and RLS policies.",
    };
  }

  // 6. Refresh product pages
  revalidatePath("/products");
  revalidatePath("/admin/products");

  return {
    message:
      `Import completed. Checked ${rows.length} API products. ` +
      "Products with existing external IDs were skipped.",
  };
}
