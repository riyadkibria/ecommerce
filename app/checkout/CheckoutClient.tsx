
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import RedxAreaSelect, { type RedxArea } from "./RedxAreaSelect";
import { createClient } from "@/app/lib/supabase/client";
import {
  getGuestCart,
  clearGuestCart,
  type GuestCartItem,
} from "@/app/lib/cart/guest-cart";

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

type CourierSlug = "redx" | "steadfast";

type CourierOption = {
  slug: CourierSlug;
  name: string;
  cost: number;
};

function formatPrice(amount: number) {
  return `৳${amount.toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

export default function CheckoutClient({ items: initialItems }: Props) {
  const [items, setItems] = useState<CheckoutItem[]>(initialItems);
  const [isGuest, setIsGuest] = useState(false);
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
    useState<"cod" | "aamarpay">("cod");

  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [couriersLoading, setCouriersLoading] = useState(true);
  const [courierLoadError, setCourierLoadError] = useState("");

  // Guest cart অথবা logged-in cart লোড করা।
  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      const supabase = createClient();

      try {
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

        const productIds = guestItems.map((item) => item.productId);

        const { data: products, error: productsError } = await supabase
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

        const checkoutItems: CheckoutItem[] = guestItems.map((item) => {
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
        });

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

  // Database থেকে delivery charges লোড করা।
  useEffect(() => {
    let cancelled = false;

    async function loadCouriers() {
      try {
        setCouriersLoading(true);
        setCourierLoadError("");

        const response = await fetch("/api/couriers", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Could not load delivery charges."
          );
        }

        const available: CourierOption[] = (result.data ?? [])
          .filter(
            (courier: CourierOption) =>
              (courier.slug === "redx" ||
                courier.slug === "steadfast") &&
              Number.isFinite(Number(courier.cost)) &&
              Number(courier.cost) >= 0
          )
          .map((courier: CourierOption) => ({
            slug: courier.slug,
            name: courier.name,
            cost: Number(courier.cost),
          }));

        if (available.length === 0) {
          throw new Error("No active delivery service is available.");
        }

        if (!cancelled) {
          setCouriers(available);

          if (!available.some((courier) => courier.slug === "redx")) {
            setSelectedCourier(available[0].slug);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setCourierLoadError(
            error instanceof Error
              ? error.message
              : "Could not load delivery charges."
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

  const selectedCourierData = couriers.find(
    (courier) => courier.slug === selectedCourier
  );

  const validItems = items.filter((item) => item.product !== null);

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

  const redxAvailable = couriers.some(
    (courier) => courier.slug === "redx"
  );

  const steadfastAvailable = couriers.some(
    (courier) => courier.slug === "steadfast"
  );

  function handleCourierChange(courier: CourierSlug) {
    setSelectedCourier(courier);
    setAreaId("");
    setSelectedArea(null);
    setNotice("");
  }

  // Order API-তে তথ্য পাঠানো।
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    if (couriersLoading || courierLoadError || !selectedCourierData) {
      setNotice("Delivery charges load হওয়া পর্যন্ত অপেক্ষা করো।");
      return;
    }

    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      setNotice("Please complete all required delivery information.");
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

    // aamarPay এখনো integrate করা হয়নি।
    if (paymentMethod === "aamarpay") {
      setNotice(
        "aamarPay payment এখনো চালু হয়নি। আপাতত Cash on Delivery নির্বাচন করো।"
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
          areaId: selectedCourier === "redx" ? Number(areaId) : null,
          paymentMethod,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Order তৈরি করা যায়নি। আবার চেষ্টা করো।"
        );
      }

      // FIX: API orderId পাঠায়; fallback হিসেবে result.order.id-ও সমর্থিত।
      const orderId = result.orderId ?? result.order?.id;

      if (
        orderId === undefined ||
        orderId === null ||
        String(orderId).trim() === ""
      ) {
        console.error("Order API response:", result);

        throw new Error(
          "Order তৈরি হয়েছে কি না নিশ্চিত হওয়া যায়নি। Orders table যাচাই করো।"
        );
      }

      // Order ID পাওয়া গেলে guest cart clear হবে।
      if (isGuest) {
        clearGuestCart();
      }

      window.location.href = `/order-success/${encodeURIComponent(
        String(orderId)
      )}`;
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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8">
          <Link
            href="/cart"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to cart
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Checkout
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Confirm your delivery details and review your order.
          </p>

          <p className="mt-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            {cartLoading
              ? "Loading cart..."
              : isGuest
                ? "Guest checkout"
                : "Account checkout"}
          </p>
        </div>

        {cartLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
            Loading your cart...
          </div>
        ) : (
          <form
            className="grid grid-cols-1 gap-8 lg:grid-cols-3"
            onSubmit={handleSubmit}
          >
            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-lg font-bold text-slate-900">
                  1. Delivery information
                </h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Full name *
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      autoComplete="name"
                      required
                      maxLength={100}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Enter recipient's full name"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Phone number *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      maxLength={20}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-lg font-bold text-slate-900">
                  2. Choose delivery service
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select your courier to see its delivery charge.
                </p>

                {couriersLoading && (
                  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    Loading delivery charges...
                  </p>
                )}

                {courierLoadError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
                  >
                    <p className="text-sm text-red-700">
                      {courierLoadError}
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-2 text-sm font-semibold text-red-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!couriersLoading && !courierLoadError && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        {
                          slug: "redx",
                          description: "Select a REDX delivery area.",
                        },
                        {
                          slug: "steadfast",
                          description: "Provide your complete address.",
                        },
                      ] as const
                    ).map(({ slug, description }) => {
                      const courier = couriers.find(
                        (item) => item.slug === slug
                      );

                      if (!courier) return null;

                      return (
                        <label
                          key={slug}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                            selectedCourier === slug
                              ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="courier"
                            value={slug}
                            checked={selectedCourier === slug}
                            onChange={() => handleCourierChange(slug)}
                            className="mt-1 accent-indigo-600"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-slate-900">
                              {courier.name}
                            </span>
                            <span className="mt-1 block text-sm text-slate-500">
                              {description}
                            </span>
                            <span className="mt-3 block text-sm font-bold text-indigo-700">
                              {formatPrice(courier.cost)}
                            </span>
                            <span className="block text-xs text-slate-500">
                              Delivery charge
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 border-t border-slate-100 pt-5">
                  {selectedCourier === "redx" && redxAvailable ? (
                    <div>
                      <h3 className="mb-1 text-sm font-semibold text-slate-900">
                        REDX delivery location
                      </h3>
                      <p className="mb-4 text-sm text-slate-500">
                        Select the division, district and delivery area.
                      </p>

                      <RedxAreaSelect
                        value={areaId}
                        onChange={setAreaId}
                        onAreaChange={setSelectedArea}
                      />

                      {selectedArea && (
                        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                          <p className="text-sm font-semibold text-slate-900">
                            Delivery postcode
                          </p>
                          <p className="mt-1 text-lg font-bold text-indigo-700">
                            {selectedArea.post_code}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {selectedArea.name}, {selectedArea.district_name},{" "}
                            {selectedArea.division_name}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : selectedCourier === "steadfast" &&
                    steadfastAvailable ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="font-semibold text-slate-900">
                        Steadfast delivery details
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Enter the recipient's full address below, including
                        house, road, area, district and a nearby landmark.
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        REDX area IDs and postcodes are not used for Steadfast.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Select an available courier to continue.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Full delivery address *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    autoComplete="street-address"
                    required
                    maxLength={500}
                    rows={4}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder={
                      selectedCourier === "redx"
                        ? "House, road, area and nearby landmark"
                        : "House, road, area, district and nearby landmark"
                    }
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Include enough detail so the courier can locate the recipient.
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-lg font-bold text-slate-900">
                  3. Payment method
                </h2>

                <div className="mt-5 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="mt-1 accent-indigo-600"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">
                        Cash on Delivery
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        Pay when your order arrives.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="aamarpay"
                      checked={paymentMethod === "aamarpay"}
                      onChange={() => setPaymentMethod("aamarpay")}
                      className="mt-1 accent-indigo-600"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">
                        Online payment
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        Pay through aamarPay once the payment integration is connected.
                      </span>
                    </span>
                  </label>
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-slate-900">
                Order summary
              </h2>

              <div className="mt-5 space-y-4">
                {items.map((item) => {
                  const product = item.product;

                  if (!product) {
                    return (
                      <p
                        key={item.productId}
                        className="text-sm text-red-600"
                      >
                        A product in your cart is unavailable.
                      </p>
                    );
                  }

                  return (
                    <div key={item.productId} className="flex gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
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

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                          {product.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Qty: {item.quantity}
                        </p>
                      </div>

                      <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
                        {formatPrice(product.price * item.quantity)}
                      </p>
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Your cart is empty.
                  </p>
                )}
              </div>

              <div className="my-5 border-t border-slate-200" />

              <div className="flex justify-between gap-3 text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="mt-4 flex justify-between gap-3 text-sm text-slate-600">
                <span>Delivery charge</span>
                <span className="text-right font-semibold text-slate-900">
                  {couriersLoading
                    ? "Loading..."
                    : courierLoadError || !selectedCourierData
                      ? "Unavailable"
                      : formatPrice(deliveryCharge)}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-3 text-sm text-slate-600">
                <span>Courier</span>
                <span className="font-medium text-slate-900">
                  {selectedCourierData?.name ??
                    (selectedCourier === "redx" ? "REDX" : "Steadfast")}
                </span>
              </div>

              {selectedCourier === "redx" && selectedArea && (
                <div className="mt-3 flex justify-between gap-3 text-sm text-slate-600">
                  <span>Postcode</span>
                  <span className="font-semibold text-slate-900">
                    {selectedArea.post_code}
                  </span>
                </div>
              )}

              <div className="my-5 border-t border-slate-200" />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="block font-bold text-slate-900">
                    Estimated total
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Products + delivery
                  </span>
                </div>
                <span className="text-xl font-extrabold text-slate-900">
                  {couriersLoading ||
                  courierLoadError ||
                  !selectedCourierData
                    ? "—"
                    : formatPrice(estimatedTotal)}
                </span>
              </div>

              {notice && (
                <p
                  role="status"
                  className="mt-4 break-words rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
                >
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  cartLoading ||
                  couriersLoading ||
                  !!courierLoadError ||
                  !selectedCourierData ||
                  validItems.length === 0 ||
                  isSubmitting
                }
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Creating order..."
                  : couriersLoading
                    ? "Loading delivery charges..."
                    : paymentMethod === "cod"
                      ? "Place order"
                      : "Continue to payment"}
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Guest checkout is supported. Your order will be validated
                securely on the server.
              </p>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}