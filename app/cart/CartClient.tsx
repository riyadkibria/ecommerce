
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

  if (!ready) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500">Loading your cart...</p>
      </main>
    );
  }

  if (error && items.length === 0) {
    return (
      <main className="min-h-[60vh] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-16">
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <svg
              className="h-10 w-10 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Your cart is empty
          </h1>

          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
            Looks like you haven't added anything yet.
            Explore our collection and find something you love.
          </p>

          <Link
            href="/products"
            className="mt-7 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
          >
            Continue Shopping →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/products"
            className="text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            ← Continue shopping
          </Link>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Shopping Cart
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Review your items before checkout.
              </p>
            </div>

            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
              {validItems.reduce(
                (total, item) => total + item.quantity,
                0
              )}{" "}
              items
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_350px]">
          <section className="min-w-0 space-y-4">
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_110px] gap-4 px-5 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
              <span>Product</span>
              <span className="text-center">Quantity</span>
              <span className="text-right">Subtotal</span>
            </div>

            {items.map((item) => {
              const product = item.product;
              const busy = busyProduct === item.productId;

              if (!product) {
                return (
                  <div
                    key={item.productId}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                  >
                    <p className="text-sm text-amber-800">
                      This product is no longer available.
                    </p>
                    <button
                      type="button"
                      disabled={busyProduct !== null}
                      onClick={() => removeItem(item.productId)}
                      className="mt-3 text-sm font-semibold text-amber-900 underline disabled:opacity-50"
                    >
                      Remove item
                    </button>
                  </div>
                );
              }

              return (
                <article
                  key={item.productId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5"
                >
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px_110px] sm:items-center">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            No image
                          </span>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col items-start">
                        <h2 className="line-clamp-2 font-semibold leading-6 text-slate-900">
                          {product.title}
                        </h2>

                        <p className="mt-2 text-sm font-medium text-slate-600">
                          {formatPrice(product.price)}
                        </p>

                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          disabled={busyProduct !== null}
                          className="mt-auto pt-3 text-xs font-medium text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                        >
                          {busy ? "Updating..." : "Remove"}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-center">
                      <span className="text-sm text-slate-500 sm:hidden">
                        Quantity
                      </span>

                      <div className="inline-flex items-center rounded-lg border border-slate-200">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${product.title}`}
                          disabled={busyProduct !== null || item.quantity <= 1}
                          onClick={() =>
                            changeQuantity(item.productId, item.quantity - 1)
                          }
                          className="flex h-9 w-9 items-center justify-center text-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                        >
                          −
                        </button>

                        <span
                          aria-live="polite"
                          className="min-w-8 text-center text-sm font-semibold tabular-nums text-slate-900"
                        >
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          aria-label={`Increase quantity of ${product.title}`}
                          disabled={busyProduct !== null || item.quantity >= 99}
                          onClick={() =>
                            changeQuantity(item.productId, item.quantity + 1)
                          }
                          className="flex h-9 w-9 items-center justify-center text-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                      <span className="text-sm text-slate-500 sm:hidden">
                        Subtotal
                      </span>
                      <p className="font-bold tabular-nums text-slate-900">
                        {formatPrice(product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <h2 className="text-lg font-bold text-slate-900">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3 text-slate-600">
                <span>
                  Subtotal ({validItems.reduce(
                    (total, item) => total + item.quantity,
                    0
                  )} items)
                </span>
                <span className="font-medium tabular-nums text-slate-900">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Shipping</span>
                <span className="text-xs text-slate-500">
                  Calculated at checkout
                </span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">
                    Estimated total
                  </span>
                  <span className="text-xl font-bold tabular-nums text-slate-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Final shipping charges will be added during checkout.
                </p>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
            >
              Proceed to Checkout →
            </Link>

            {isGuest && (
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Guest cart is saved in this browser. It may not appear on
                another device or browser.
              </p>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span aria-hidden="true">🔒</span>
              Secure checkout
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
