import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/app/lib/supabase/server";
import AddToCartButton from "@/app/components/cart/AddToCartButton";

import { getRelatedProducts } from "@/app/lib/products/related";
import RelatedProductsCarousel from "@/app/components/products/RelatedProductsCarousel";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

const LOW_STOCK_THRESHOLD = 5;

export default async function ProductDetailPage({
  params,
}: ProductPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // 1. Fetch the current product
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // 2. Handle database errors
  if (error) {
    console.error("[PRODUCT_DETAIL_ERROR]", {
      productId: id,
      message: error.message,
    });

    throw new Error("Failed to load product.");
  }

  // 3. Handle missing products
  if (!product) {
    notFound();
  }

  // 4. Fetch related products from the same category
  const relatedProducts = await getRelatedProducts(
    product.category_id ?? null,
    product.id
  );

  const price = Number(product.price);
  const stock = Number(product.stock);
  const hasPrice = Number.isFinite(price);
  const inStock = Number.isFinite(stock) && stock > 0;
  const lowStock = inStock && stock <= LOW_STOCK_THRESHOLD;

  return (
    <main className="min-h-screen w-full bg-[#FAFAFB] text-[13px] text-slate-900 antialiased">
      {/* Top bar with breadcrumb */}
      <header className="flex h-12 items-center border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur sm:px-8">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-2 text-xs text-slate-500">
            <li>
              <Link
                href="/products"
                className="inline-flex items-center gap-1 rounded font-medium text-slate-600 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 5l-7 7 7 7" />
                </svg>
                Products
              </Link>
            </li>

            <li aria-hidden="true" className="text-slate-300">
              /
            </li>

            <li
              aria-current="page"
              className="max-w-[200px] truncate text-slate-900 sm:max-w-sm"
            >
              {product.title}
            </li>
          </ol>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        {/* Product details */}
        <section
          aria-labelledby="product-title"
          className="grid items-start gap-8 md:grid-cols-[1.15fr_1fr] lg:gap-14"
        >
          {/* Product image */}
          <div className="md:sticky md:top-6">
            <div className="relative flex aspect-square max-h-[540px] min-h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.06] sm:p-12">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt={product.title}
                  fetchPriority="high"
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="text-xs text-slate-400">No image available</p>
              )}

              {!inStock && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-rose-700 shadow-sm ring-1 ring-inset ring-rose-200 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Sold out
                </span>
              )}
            </div>
          </div>

          {/* Product information */}
          <div className="flex min-w-0 flex-col md:pt-2">
            {product.brand && (
              <p className="mb-2 text-xs font-medium text-emerald-700">
                {product.brand}
              </p>
            )}

            <h1
              id="product-title"
              className="text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-950 sm:text-[28px]"
            >
              {product.title}
            </h1>

            {/* Price + stock */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-3xl font-semibold tabular-nums tracking-[-0.02em] text-slate-950">
                {hasPrice ? (
                  <>
                    <span className="mr-1 text-xl font-medium text-slate-400">
                      ৳
                    </span>
                    {price.toLocaleString("en-BD")}
                  </>
                ) : (
                  <span className="text-sm font-medium text-slate-500">
                    Price unavailable
                  </span>
                )}
              </p>

              {inStock ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                    lowStock
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      lowStock ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  {lowStock ? `Only ${stock} left` : "In stock"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-slate-400"
                  />
                  Out of stock
                </span>
              )}
            </div>

            {/* Add to cart */}
            <div className="mt-6 w-full max-w-sm">
              {inStock ? (
                <AddToCartButton productId={product.id} />
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-9 w-full cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-400"
                >
                  Out of stock
                </button>
              )}
            </div>

            {/* Description */}
            <div className="mt-8 border-t border-slate-200/80 pt-6">
              <h2 className="text-sm font-semibold text-slate-900">
                About this product
              </h2>

              <p className="mt-2.5 max-w-prose whitespace-pre-line text-[13px] leading-[1.75] text-slate-600">
                {product.description || "No description available."}
              </p>
            </div>

            {/* Details */}
            <dl className="mt-7 overflow-hidden rounded-xl bg-white text-[13px] shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-slate-900/[0.06]">
              {product.brand && (
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
                  <dt className="text-slate-500">Brand</dt>
                  <dd className="font-medium text-slate-900">
                    {product.brand}
                  </dd>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
                <dt className="text-slate-500">Availability</dt>
                <dd className="font-medium text-slate-900">
                  {inStock ? `${stock} available` : "Out of stock"}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-slate-500">Product ID</dt>
                <dd className="font-mono text-xs tabular-nums text-slate-600">
                  {product.id}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Related products carousel */}
        <div className="mt-14 border-t border-slate-200/80 pt-8">
          <RelatedProductsCarousel products={relatedProducts} />
        </div>
      </div>
    </main>
  );
}