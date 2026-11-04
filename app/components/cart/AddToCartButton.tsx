"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import { createClient } from "@/app/lib/supabase/client";
import { addToGuestCart } from "@/app/lib/cart/guest-cart";

type AddToCartButtonProps = {
  productId: number | string;
};

export default function AddToCartButton({
  productId,
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  async function handleAddToCart() {
    if (loading) return;

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const parsedProductId = Number(productId);

      if (
        !Number.isSafeInteger(parsedProductId) ||
        parsedProductId <= 0
      ) {
        throw new Error("Invalid product.");
      }

      const supabase = createClient();

      // Read the existing browser session.
      // If session lookup fails, allow guest-cart fallback.
      let user = null;

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!error) {
          user = session?.user ?? null;
        }
      } catch {
        // Session unavailable: continue as a guest.
      }

      if (user) {
        // Logged-in customer: use the existing Supabase cart.
        const result = await addToCart(parsedProductId);

        setSuccess(result.success);
        setMessage(result.message);

        if (result.success) {
          router.refresh();
        }

        return;
      }

      // Guest customer: save the product in localStorage.
      addToGuestCart(parsedProductId);

      window.dispatchEvent(new Event("guest-cart-updated"));

      setSuccess(true);
      setMessage("Added to cart successfully!");

      router.refresh();
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={loading}
        aria-busy={loading}
        className={`
          group flex h-8 w-full items-center justify-center gap-1.5
          rounded-md border px-3 text-xs font-medium
          outline-none transition-colors duration-150
          focus-visible:ring-2 focus-visible:ring-emerald-500/50
          focus-visible:ring-offset-1 focus-visible:ring-offset-white
          disabled:cursor-not-allowed disabled:opacity-70
          motion-reduce:transition-none
          ${
            success
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700"
          }
        `}
      >
        {loading ? (
          <svg
            className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
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
        ) : success ? (
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m5 12.5 4.5 4.5L19 7" />
          </svg>
        ) : (
          <svg
            className="h-3.5 w-3.5"
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
        )}

        {loading ? "Adding…" : success ? "Added" : "Add to cart"}
      </button>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-1.5 text-center text-xs leading-4 ${
            success ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}