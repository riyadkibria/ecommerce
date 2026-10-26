"use client";

import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import type { Product, Category } from "./type";

type Props = {
  initialProducts: Product[];
  initialTotal: number;
  categories: Category[];
  initialError: string;
};

type ProductsResponse = {
  products?: Product[];
  total?: number;
  error?: string;
};

const PAGE_SIZE = 12;

export default function ProductsClient({
  initialProducts,
  initialTotal,
  categories,
  initialError,
}: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          search,
          category,
          sort,
        });

        const response = await fetch(`/api/products?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result: ProductsResponse = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Could not load products.");
        }

        setProducts(result.products ?? []);
        setTotal(result.total ?? 0);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading products."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, category, sort, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function clearFilters() {
    setSearch("");
    setCategory("");
    setSort("newest");
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-8 border-b border-neutral-200 pb-8 sm:mb-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          The collection
        </p>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
              Discover products
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">
              Explore our collection and find the right product for you.
            </p>
          </div>

          <p className="text-sm text-neutral-500">
            {total} {total === 1 ? "product" : "products"}
          </p>
        </div>
      </header>

      <section aria-label="Product search and filters">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="block">
            <span className="sr-only">Search products</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search products..."
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100"
            />
          </label>

          <label>
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-500"
            >
              <option value="">All categories</option>

              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Sort products</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-500"
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </label>
        </div>
      </section>

      <section
        aria-label="Products"
        aria-busy={loading}
        className="mt-7"
      >
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
          >
            <p className="font-semibold">Unable to load products</p>
            <p className="mt-2">{error}</p>

            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="mt-4 rounded-lg border border-red-200 px-4 py-2 font-medium hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        ) : products.length === 0 && loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-3"
              >
                <div className="aspect-4/3 rounded-xl bg-neutral-100" />
                <div className="mt-4 h-4 rounded bg-neutral-100" />
                <div className="mt-3 h-4 w-2/3 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-neutral-900">
              No products found
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Try another search or choose a different category.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {loading && (
              <p className="mt-4 text-center text-sm text-neutral-500">
                Updating products...
              </p>
            )}

            <nav
              aria-label="Product pagination"
              className="mt-10 flex flex-wrap items-center justify-center gap-2"
            >
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="min-h-10 rounded-xl border border-neutral-200 bg-white px-4 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-3 text-sm text-neutral-600">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="min-h-10 rounded-xl border border-neutral-200 bg-white px-4 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}