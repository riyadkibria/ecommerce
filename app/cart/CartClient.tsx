"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import {
  getGuestCart,
  updateGuestCartQuantity,
  removeFromGuestCart,
  type GuestCartItem,
} from "@/app/lib/cart/guest-cart";
import {
  removeCartItem,
  updateCartItemQuantity,
} from "@/app/actions/cart-page";

type CartItem = {
  productId: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    image: string | null;
  } | null;
};

type Props = {
  initialItems: CartItem[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(price);
}

/* -------------------------------------------------------------------------- */
/*  Small icons                                                               */
/* -------------------------------------------------------------------------- */

function CartIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3h2l2.4 11.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function CartClient({ initialItems }: Props) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [isGuest, setIsGuest] = useState(false);
  const [ready, setReady] = useState(false);
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const supabase = createClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        // If a session exists, keep using the authenticated cart.
        if (!sessionError && session?.user) {
          if (!cancelled) {
            setIsGuest(false);
            setItems(initialItems);
            setReady(true);
          }
          return;
        }

        // Guest cart: read product IDs and quantities from localStorage.
        const guestItems: GuestCartItem[] = getGuestCart();

        if (guestItems.length === 0) {
          if (!cancelled) {
            setIsGuest(true);
            setItems([]);
            setReady(true);
          }
          return;
        }

        const productIds = [
          ...new Set(guestItems.map((item) => item.productId)),
        ];

        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, title, price, image")
          .in("id", productIds);

        if (productsError) {
          throw productsError;
        }

        const productMap = new Map(
          (products ?? []).map((product) => [
            String(product.id),
            {
              id: String(product.id),
              title: product.title,
              price: Number(product.price),
              image: product.image ?? null,
            },
          ])
        );

        const cartItems: CartItem[] = guestItems.map((item) => ({
          productId: String(item.productId),
          quantity: item.quantity,
          product: productMap.get(String(item.productId)) ?? null,
        }));

        if (!cancelled) {
          setIsGuest(true);
          setItems(cartItems);
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your cart."
          );
          setReady(true);
        }
      }
    }

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [initialItems]);

  useEffect(() => {
    function refreshGuestCart() {
      if (isGuest) {
        window.location.reload();
      }
    }

    window.addEventListener("guest-cart-updated", refreshGuestCart);

    return () => {
      window.removeEventListener("guest-cart-updated", refreshGuestCart);
    };
  }, [isGuest]);

  const validItems = items.filter(
    (item) => item.product !== null
  );

  const subtotal = useMemo(
    () =>
      validItems.reduce(
        (total, item) =>
          total + item.product!.price * item.quantity,
        0
      ),
    [validItems]
  );

  const itemCount = validItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  async function changeQuantity(
    productId: string,
    quantity: number
  ) {
    if (quantity < 1 || busyProduct) return;

    const currentItem = items.find(
      (item) => item.productId === productId
    );

    if (!currentItem || quantity === currentItem.quantity) return;

    setError("");
    setBusyProduct(productId);

    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );

    try {
      if (isGuest) {
        updateGuestCartQuantity(Number(productId), quantity);

        window.dispatchEvent(new Event("guest-cart-updated"));
        return;
      }

      const result = await updateCartItemQuantity(
        productId,
        quantity
      );

      if (!result.success) {
        setItems((current) =>
          current.map((item) =>
            item.productId === productId
              ? { ...item, quantity: currentItem.quantity }
              : item
          )
        );

        setError(result.message);
        return;
      }

      router.refresh();
    } catch {
      setItems((current) =>
        current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: currentItem.quantity }
            : item
        )
      );

      setError("Could not update quantity. Please try again.");
    } finally {
      setBusyProduct(null);
    }
  }

  async function removeItem(productId: string) {
    if (busyProduct) return;

    const previousItems = items;

    setError("");
    setBusyProduct(productId);
    setItems((current) =>
      current.filter((item) => item.productId !== productId)
    );

    try {
      if (isGuest) {
        removeFromGuestCart(Number(productId));
        window.dispatchEvent(new Event("guest-cart-updated"));
        return;
      }

      const result = await removeCartItem(productId);

      if (!result.success) {
        setItems(previousItems);
        setError(result.message);
        return;
      }

      router.refresh();
    } catch {
      setItems(previousItems);
      setError("Could not remove the product. Please try again.");
    } finally {
      setBusyProduct(null);
    }
  }

  /* ------------------------------ Loading state ------------------------------ */

  if (!ready) {
    return (
      <main
        className="flex min-h-[60vh] items-center justify-center bg-[#FAFAFB] px-4 text-[13px] antialiased"
        aria-busy="true"
      >
        <div className="flex items-center gap-2 text-slate-500">
          <svg
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-20"
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          Loading your cart…
        </div>
      </main>
    );
  }

  /* ------------------------------- Error state ------------------------------- */

  if (error && items.length === 0) {
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
                {error}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/70 px-3 py-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-7 items-center rounded-md bg-slate-900 px-3 text-xs font-medium text-white outline-none transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------- Empty state ------------------------------- */

  if (items.length === 0) {
    return (
      <main className="flex min-h-[60vh] items-start justify-center bg-[#FAFAFB] px-4 pb-16 pt-14 text-[13px] text-slate-900 antialiased sm:pt-20">
        <div className="flex w-full max-w-sm flex-col items-center rounded-xl bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.06]">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200">
            <CartIcon className="h-5 w-5" />
          </span>

          <h1 className="mt-4 text-sm font-semibold tracking-tight">
            Your cart is empty
          </h1>

          <p className="mt-1.5 max-w-[260px] text-xs leading-5 text-slate-500">
            Looks like you haven&apos;t added anything yet. Explore the
            collection and find something you love.
          </p>

          <Link
            href="/products"
            className="mt-5 inline-flex h-8 items-center rounded-md bg-slate-900 px-4 text-xs font-medium text-white outline-none transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1"
          >
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  /* -------------------------------- Cart view -------------------------------- */

  return (
    <main className="min-h-screen bg-[#FAFAFB] text-[13px] text-slate-900 antialiased">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        {/* Heading */}
        <div className="mb-5">
          <Link
            href="/products"
            className="inline-flex items-center gap-1 rounded text-xs font-medium text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <ChevronLeftIcon />
            Continue shopping
          </Link>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-[-0.01em]">
                Shopping cart
              </h1>

              <p className="mt-0.5 text-xs text-slate-500">
                Review your items before checkout.
              </p>
            </div>

            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
          >
            {error}
          </div>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px] lg:gap-5">
          {/* Items */}
          <section
            aria-label="Cart items"
            className="min-w-0 overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-slate-900/[0.06]"
          >
            <div className="hidden grid-cols-[minmax(0,1fr)_96px_96px] gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs font-medium text-slate-500 sm:grid">
              <span>Product</span>
              <span className="text-center">Quantity</span>
              <span className="text-right">Subtotal</span>
            </div>

            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const product = item.product;
                const busy = busyProduct === item.productId;

                if (!product) {
                  return (
                    <li
                      key={item.productId}
                      className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/60 px-4 py-3"
                    >
                      <p className="text-xs text-amber-800">
                        This product is no longer available.
                      </p>

                      <button
                        type="button"
                        disabled={busyProduct !== null}
                        onClick={() => removeItem(item.productId)}
                        className="rounded text-xs font-medium text-amber-900 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50"
                      >
                        Remove item
                      </button>
                    </li>
                  );
                }

                return (
                  <li
                    key={item.productId}
                    className={`px-4 py-3 transition-opacity ${
                      busy ? "opacity-60" : ""
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px_96px] sm:items-center">
                      {/* Product */}
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-200/80">
                          {product.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              No image
                            </span>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col items-start">
                          <h2 className="line-clamp-2 text-[13px] font-medium leading-5 text-slate-900">
                            {product.title}
                          </h2>

                          <p className="text-xs tabular-nums text-slate-500">
                            {formatPrice(product.price)}
                          </p>

                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            disabled={busyProduct !== null}
                            className="mt-1 rounded text-xs font-medium text-slate-400 outline-none transition hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:opacity-50"
                          >
                            {busy ? "Updating…" : "Remove"}
                          </button>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center justify-between sm:justify-center">
                        <span className="text-xs text-slate-500 sm:hidden">
                          Quantity
                        </span>

                        <div className="inline-flex h-7 items-center overflow-hidden rounded-md border border-slate-200 bg-white">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${product.title}`}
                            disabled={
                              busyProduct !== null || item.quantity <= 1
                            }
                            onClick={() =>
                              changeQuantity(item.productId, item.quantity - 1)
                            }
                            className="flex h-full w-7 items-center justify-center text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <MinusIcon />
                          </button>

                          <span
                            aria-live="polite"
                            className="min-w-7 text-center text-xs font-semibold tabular-nums text-slate-900"
                          >
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            aria-label={`Increase quantity of ${product.title}`}
                            disabled={
                              busyProduct !== null || item.quantity >= 99
                            }
                            onClick={() =>
                              changeQuantity(item.productId, item.quantity + 1)
                            }
                            className="flex h-full w-7 items-center justify-center text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <PlusIcon />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="flex items-center justify-between sm:block sm:text-right">
                        <span className="text-xs text-slate-500 sm:hidden">
                          Subtotal
                        </span>

                        <p className="text-[13px] font-semibold tabular-nums text-slate-900">
                          {formatPrice(product.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Order summary */}
          <aside className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_16px_32px_-24px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/[0.06] lg:sticky lg:top-16">
            <h2 className="text-sm font-semibold tracking-tight">
              Order summary
            </h2>

            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3 text-slate-500">
                <dt>
                  Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                </dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {formatPrice(subtotal)}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3 text-slate-500">
                <dt>Shipping</dt>
                <dd className="text-slate-400">Calculated at checkout</dd>
              </div>
            </dl>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold">
                  Estimated total
                </span>

                <span className="text-base font-semibold tabular-nums tracking-tight">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <p className="mt-1.5 text-xs leading-5 text-slate-400">
                Final shipping charges will be added during checkout.
              </p>
            </div>

            <Link
              href="/checkout"
              className="mt-4 flex h-9 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-[13px] font-medium text-white outline-none transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2"
            >
              Proceed to checkout
            </Link>

            {isGuest && (
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Guest cart is saved in this browser. It may not appear on
                another device or browser.
              </p>
            )}

            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <LockIcon />
              Secure checkout
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}