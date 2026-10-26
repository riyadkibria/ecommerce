
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
    <div className="w-full max-w-[233px]">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={loading}
        aria-busy={loading}
        className="
          group grid h-[55px] w-full grid-cols-[1fr_1.618fr]
          overflow-hidden rounded-full
          border border-[#d9c7a0] bg-[#fbf8f3] text-[#3b3126]
          shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_21px_-13px_rgba(166,124,46,0.45)]
          transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out
          hover:border-[#c4a867] hover:bg-[#f5eedf]
          hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_13px_21px_-13px_rgba(166,124,46,0.55)]
          active:scale-[0.98]
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-[#a67c2e]
          focus-visible:ring-offset-2 focus-visible:ring-offset-white
          disabled:cursor-not-allowed disabled:opacity-80
          motion-reduce:transition-none motion-reduce:active:scale-100
        "
      >
        <span
          className={`
            flex items-center justify-center border-r border-[#e6dcc8]
            transition-colors duration-300 motion-reduce:transition-none
            ${success ? "text-emerald-600" : "text-[#a67c2e]"}
          `}
        >
          {loading ? (
            <svg
              className="h-[21px] w-[21px] animate-spin motion-reduce:animate-none"
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
                strokeWidth="2"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : success ? (
            <svg
              className="h-[21px] w-[21px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12.5 4.5 4.5L19 7" />
            </svg>
          ) : (
            <svg
              className="h-[21px] w-[21px] transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3h2l2.4 11.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
          )}
        </span>

        <span className="flex items-center justify-center px-[13px] text-[13px] font-medium leading-[1.618] tracking-[0.02em]">
          {loading ? "Adding…" : "Add to cart"}
        </span>
      </button>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-[13px] flex items-start justify-center gap-[8px] text-center text-[13px] leading-[1.618] ${
            success ? "text-emerald-700" : "text-red-700"
          }`}
        >
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
