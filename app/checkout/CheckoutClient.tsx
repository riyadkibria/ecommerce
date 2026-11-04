"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  getGuestCart,
  clearGuestCart,
  type GuestCartItem,
} from "@/app/lib/cart/guest-cart";
import type { RedxArea } from "./RedxAreaSelect";
import CheckoutForm from "./CheckoutForm";

type CheckoutItem = {
  productId: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    image: string | null;
    stock: number;
  } | null;
};

type Props = {
  items: CheckoutItem[];
};

export type CourierSlug = "redx" | "steadfast";
export type PaymentMethod = "cod" | "aamarpay" | "sslcommerz";

export type CourierOption = {
  slug: CourierSlug;
  name: string;
  cost: number;
};

type OrderApiResponse = {
  success: boolean;
  message?: string;
  orderId?: string | number;
  order?: { id?: string | number };
  paymentUrl?: string;
};

function getSafePaymentUrl(
  value: unknown,
  paymentMethod: PaymentMethod
): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") return null;

    const hostname = url.hostname.toLowerCase();

    if (paymentMethod === "aamarpay") {
      if (
        hostname !== "aamarpay.com" &&
        !hostname.endsWith(".aamarpay.com")
      ) {
        return null;
      }
    } else if (paymentMethod === "sslcommerz") {
      if (
        hostname !== "sandbox.sslcommerz.com" &&
        hostname !== "securepay.sslcommerz.com"
      ) {
        return null;
      }
    } else {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export default function CheckoutClient({
  items: initialItems,
}: Props) {
  const [items, setItems] = useState<CheckoutItem[]>(initialItems);
  const [isGuest, setIsGuest] = useState(true);
  const [cartLoading, setCartLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [selectedCourier, setSelectedCourier] =
    useState<CourierSlug>("redx");

  const [areaId, setAreaId] = useState("");
  const [selectedArea, setSelectedArea] =
    useState<RedxArea | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cod");

  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [couriersLoading, setCouriersLoading] = useState(true);
  const [courierLoadError, setCourierLoadError] = useState("");

  // 1. Load authenticated user's cart or guest cart.
  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const supabase = createClient();

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw new Error(
            "Could not verify your session. Please refresh."
          );
        }

        if (session?.user) {
          if (!cancelled) {
            setIsGuest(false);
            setItems(initialItems);
          }
          return;
        }

        if (!cancelled) setIsGuest(true);

        const guestItems: GuestCartItem[] = getGuestCart();

        if (guestItems.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        const productIds = [
          ...new Set(guestItems.map((item) => item.productId)),
        ];

        const { data: products, error: productsError } =
          await supabase
            .from("products")
            .select("id, title, price, image, stock")
            .in("id", productIds);

        if (productsError) {
          throw new Error("Could not load your cart products.");
        }

        const productMap = new Map(
          (products ?? []).map((product) => [
            String(product.id),
            product,
          ])
        );

        const checkoutItems: CheckoutItem[] = guestItems.map(
          (item) => {
            const product = productMap.get(String(item.productId));

            return {
              productId: String(item.productId),
              quantity: item.quantity,
              product: product
                ? {
                    id: String(product.id),
                    title: product.title ?? "Untitled product",
                    price: Number(product.price),
                    image: product.image ?? null,
                    stock: Number(product.stock ?? 0),
                  }
                : null,
            };
          }
        );

        if (!cancelled) setItems(checkoutItems);
      } catch (error) {
        if (!cancelled) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Could not load your cart."
          );
        }
      } finally {
        if (!cancelled) setCartLoading(false);
      }
    }

    void loadCart();

    return () => {
      cancelled = true;
    };
  }, [initialItems]);

  // 2. Load active courier services.
  useEffect(() => {
    let cancelled = false;

    async function loadCouriers() {
      try {
        setCouriersLoading(true);
        setCourierLoadError("");

        const response = await fetch("/api/couriers", {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "message" in result &&
            typeof result.message === "string"
              ? result.message
              : "Could not load delivery services.";

          throw new Error(message);
        }

        if (
          typeof result !== "object" ||
          result === null ||
          !("success" in result) ||
          result.success !== true ||
          !("data" in result) ||
          !Array.isArray(result.data)
        ) {
          throw new Error(
            "The delivery service response is invalid."
          );
        }

        const available: CourierOption[] = result.data
          .filter((courier: unknown): courier is CourierOption => {
            if (
              typeof courier !== "object" ||
              courier === null
            ) {
              return false;
            }

            const item = courier as Record<string, unknown>;

            return (
              (item.slug === "redx" ||
                item.slug === "steadfast") &&
              typeof item.name === "string" &&
              item.name.trim().length > 0 &&
              item.cost !== null &&
              item.cost !== "" &&
              Number.isFinite(Number(item.cost)) &&
              Number(item.cost) >= 0
            );
          })
          .map((courier) => ({
            slug: courier.slug,
            name: courier.name,
            cost: Number(courier.cost),
          }));

        if (available.length === 0) {
          throw new Error(
            "No active delivery service is available."
          );
        }

        if (!cancelled) {
          setCouriers(available);

          setSelectedCourier((current) =>
            available.some(
              (courier) => courier.slug === current
            )
              ? current
              : available[0].slug
          );
        }
      } catch (error) {
        if (!cancelled) {
          setCourierLoadError(
            error instanceof Error
              ? error.message
              : "Could not load delivery services."
          );
        }
      } finally {
        if (!cancelled) setCouriersLoading(false);
      }
    }

    void loadCouriers();

    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Calculations.
  const selectedCourierData = couriers.find(
    (courier) => courier.slug === selectedCourier
  );

  const validItems = items.filter(
    (item) => item.product !== null
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + (item.product?.price ?? 0) * item.quantity,
        0
      ),
    [items]
  );

  const deliveryCharge = selectedCourierData?.cost ?? 0;
  const estimatedTotal = subtotal + deliveryCharge;

  // 4. Courier selection handler.
  function handleCourierChange(courier: CourierSlug) {
    setSelectedCourier(courier);
    setAreaId("");
    setSelectedArea(null);
    setNotice("");
  }

  // 5. Clear guest cart only after successful COD order creation.
  function clearGuestCartAfterSuccessfulOrder() {
    clearGuestCart();
    window.dispatchEvent(new Event("guest-cart-updated"));
    setItems([]);
  }

  // 6. Validate and submit the order.
  async function handleSubmit() {
    if (isSubmitting) return;

    setNotice("");

    if (cartLoading) {
      setNotice("কার্ট লোড হওয়া পর্যন্ত অপেক্ষা করো।");
      return;
    }

    if (items.length === 0 || validItems.length !== items.length) {
      setNotice(
        "তোমার কার্টে কোনো product নেই অথবা কোনো product unavailable।"
      );
      return;
    }

    if (
      couriersLoading ||
      courierLoadError ||
      !selectedCourierData
    ) {
      setNotice(
        "Delivery service load হওয়া পর্যন্ত অপেক্ষা করো।"
      );
      return;
    }

    if (
      !fullName.trim() ||
      !phone.trim() ||
      !address.trim()
    ) {
      setNotice(
        "Please complete all required delivery information."
      );
      return;
    }

    if (
      selectedCourier === "redx" &&
      (!/^\d+$/.test(areaId) ||
        Number(areaId) <= 0 ||
        !selectedArea ||
        String(selectedArea.id) !== areaId)
    ) {
      setNotice("Please select your REDX delivery area.");
      return;
    }

    const outOfStock = validItems.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99 ||
        !Number.isFinite(item.product!.stock) ||
        item.product!.stock < item.quantity ||
        item.product!.stock <= 0
    );

    if (outOfStock) {
      setNotice(
        "কোনো product-এর stock অপর্যাপ্ত। Order দেওয়ার আগে cart ও stock যাচাই করো।"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city:
            selectedCourier === "redx"
              ? selectedArea?.district_name ?? ""
              : "",
          courierSlug: selectedCourier,
          areaId:
            selectedCourier === "redx"
              ? Number(areaId)
              : null,
          paymentMethod,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      let result: OrderApiResponse;

      try {
        result = (await response.json()) as OrderApiResponse;
      } catch {
        throw new Error(
          "Server থেকে সঠিক response পাওয়া যায়নি। Terminal পরীক্ষা করো।"
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Order তৈরি করা যায়নি। আবার চেষ্টা করো।"
        );
      }

      const orderId = result.orderId ?? result.order?.id;

      if (
        orderId === undefined ||
        orderId === null ||
        String(orderId).trim() === ""
      ) {
        throw new Error(
          "Order ID পাওয়া যায়নি। Supabase-এর orders table যাচাই করো।"
        );
      }

      // Online payment: keep the cart until payment is verified.
      if (
        paymentMethod === "aamarpay" ||
        paymentMethod === "sslcommerz"
      ) {
        const paymentUrl = getSafePaymentUrl(
          result.paymentUrl,
          paymentMethod
        );

        if (!paymentUrl) {
          throw new Error(
            `${paymentMethod === "sslcommerz" ? "SSLCommerz" : "aamarPay"} payment URL পাওয়া যায়নি। Server log পরীক্ষা করো।`
          );
        }

        window.location.assign(paymentUrl);
        return;
      }

      // COD order: clear guest cart after successful order creation.
      if (isGuest) {
        clearGuestCartAfterSuccessfulOrder();
      }

      window.location.assign(
        `/order-success/${encodeURIComponent(String(orderId))}`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Order তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করো।"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // 7. Pass data and handlers to the design component.
  return (
    <CheckoutForm
      items={items}
      isGuest={isGuest}
      cartLoading={cartLoading}
      fullName={fullName}
      setFullName={setFullName}
      phone={phone}
      setPhone={setPhone}
      address={address}
      setAddress={setAddress}
      selectedCourier={selectedCourier}
      handleCourierChange={handleCourierChange}
      areaId={areaId}
      setAreaId={setAreaId}
      selectedArea={selectedArea}
      setSelectedArea={setSelectedArea}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      notice={notice}
      isSubmitting={isSubmitting}
      handleSubmit={handleSubmit}
      couriers={couriers}
      couriersLoading={couriersLoading}
      courierLoadError={courierLoadError}
      selectedCourierData={selectedCourierData}
      validItemsCount={validItems.length}
      subtotal={subtotal}
      deliveryCharge={deliveryCharge}
      estimatedTotal={estimatedTotal}
    />
  );
}
