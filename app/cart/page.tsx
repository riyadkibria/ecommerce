import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import CartClient from "./CartClient";

export const metadata = {
  title: "Shopping Cart | Your Store",
  description: "Review your shopping cart before checkout.",
};

export default async function CartPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If authentication is unavailable, render the page with an empty
  // initial cart. CartClient will load guest items from localStorage.
  if (authError || !user) {
    return <CartClient initialItems={[]} />;
  }

  // Logged-in customers continue using the existing Supabase cart.
  const { data: cartItems, error } = await supabase
    .from("cart_items")
    .select(`
      product_id,
      quantity,
      product:products (
        id,
        title,
        price,
        image
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to fetch cart:", error.message);

    return (
      <main className="flex min-h-[60vh] items-start justify-center bg-[#FAFAFB] px-4 pb-16 pt-14 text-[13px] text-slate-900 antialiased sm:pt-20">
        <div
          role="alert"
          className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.06]"
        >
          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5M12 16.5h.01" />
              </svg>
            </span>

            <div className="min-w-0">
              <h1 className="text-[13px] font-semibold leading-5 tracking-tight">
                Unable to load your cart
              </h1>

              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Please refresh the page and try again.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 bg-slate-50/70 px-3 py-2">
            <Link
              href="/products"
              className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-slate-600 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              Browse products
            </Link>

            <Link
              href="/cart"
              className="inline-flex h-7 items-center rounded-md bg-slate-900 px-3 text-xs font-medium text-white outline-none transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1"
            >
              Try again
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const items = (cartItems ?? []).map((item) => {
    const product = Array.isArray(item.product)
      ? item.product[0]
      : item.product;

    return {
      productId: String(item.product_id),
      quantity: item.quantity,
      product: product
        ? {
            id: String(product.id),
            title: product.title ?? "Untitled product",
            price: Number(product.price),
            image: product.image ?? null,
          }
        : null,
    };
  });

  return <CartClient initialItems={items} />;
}