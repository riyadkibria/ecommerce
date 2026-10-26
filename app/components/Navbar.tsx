
import Link from "next/link";
import { connection } from "next/server";
import { getCartCount } from "@/app/actions/cart-count";

export default async function Navbar() {
  // Wait for an incoming request before rendering dynamic data.
  await connection();

  const cartCount = await getCartCount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-slate-900"
        >
          MyStore<span className="text-indigo-600">.</span>
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-2 sm:gap-5">
          <Link
            href="/"
            className="rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:text-indigo-600 sm:px-3"
          >
            Home
          </Link>

          <Link
            href="/products"
            className="rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:text-indigo-600 sm:px-3"
          >
            Products
          </Link>

          {/* Server-rendered cart count */}
          <Link
            href="/cart"
            aria-label={`Shopping cart, ${cartCount} items`}
            className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            <svg
              className="h-5 w-5 transition-transform group-hover:scale-110"
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
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/account"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            Account
          </Link>
        </div>
      </nav>
    </header>
  );
}
