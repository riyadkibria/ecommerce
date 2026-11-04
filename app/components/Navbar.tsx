
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCartCount } from "@/app/actions/cart-count";

type Category = {
  id: string;
  name: string;
};

export default async function Navbar() {
  // Wait for an incoming request
  await connection();

  const supabase = await createClient();

  // Fetch cart count and categories simultaneously
  const [cartCount, { data: categories, error }] = await Promise.all([
    getCartCount(),

    supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (error) {
    console.error("Category fetch error:", error.message);
  }

  const categoryList: Category[] = categories ?? [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-xs font-bold text-white">
            M
          </span>

          <span className="text-sm font-semibold tracking-tight text-slate-900">
            MyStore
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">

          {/* Home */}
          <Link
            href="/"
            className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Home
          </Link>

          {/* Products */}
          <Link
            href="/products"
            className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Products
          </Link>

          {/* Categories Dropdown */}
          <div className="group relative">
            <button
              type="button"
              aria-haspopup="true"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              Categories

              <svg
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div className="invisible absolute left-0 top-full z-50 mt-1 w-56 translate-y-1 rounded-lg border border-slate-200 bg-white p-1 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">

              {categoryList.length > 0 ? (
                categoryList.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${encodeURIComponent(category.name)}`}
                    className="block rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none"
                  >
                    {category.name}
                  </Link>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-slate-400">
                  No categories available
                </p>
              )}

            </div>
          </div>

          {/* Cart */}
          <Link
            href="/cart"
            aria-label={`Shopping cart, ${cartCount} items`}
            className="group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg
              className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3h2l2.4 11.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>

            <span>Cart</span>

            {cartCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold tabular-nums text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* Divider */}
          <span
            aria-hidden="true"
            className="mx-1.5 hidden h-4 w-px bg-slate-200 sm:block"
          />

          {/* Account */}
          <Link
            href="/account"
            className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Account
          </Link>

        </div>
      </nav>
    </header>
  );
}
