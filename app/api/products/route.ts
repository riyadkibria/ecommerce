// src/app/api/products/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";


const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;

  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = (params.get("search") ?? "").trim().slice(0, 100);
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "newest";

  let query = supabase
    .from("products")
    .select("*", { count: "exact" });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (category) {
    query = query.eq("category_id", category);
  }

  switch (sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "name-asc":
      query = query.order("title", { ascending: true });
      break;
    default:
      query = query.order("id", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("Products API error:", error.message);

    return NextResponse.json(
      { error: "Could not load products." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    products: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}