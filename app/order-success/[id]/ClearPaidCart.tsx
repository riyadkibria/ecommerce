
"use client";

import { useEffect } from "react";
import { clearGuestCart } from "@/app/lib/cart/guest-cart";

type Props = {
  paymentMethod: string | null;
  paymentStatus: string | null;
};

export default function ClearPaidCart({
  paymentMethod,
  paymentStatus,
}: Props) {
  useEffect(() => {
    const isSuccessfulSSLCommerzPayment =
      paymentMethod === "sslcommerz" &&
      paymentStatus?.toLowerCase() === "paid";

    if (!isSuccessfulSSLCommerzPayment) {
      return;
    }

    clearGuestCart();
    window.dispatchEvent(new Event("guest-cart-updated"));
  }, [paymentMethod, paymentStatus]);

  return null;
}
