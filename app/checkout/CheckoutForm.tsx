"use client";

import Link from "next/link";
import RedxAreaSelect, { type RedxArea } from "./RedxAreaSelect";
import type {
  CourierOption,
  CourierSlug,
  PaymentMethod,
} from "./CheckoutClient";

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
  isGuest: boolean;
  cartLoading: boolean;

  fullName: string;
  setFullName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;

  selectedCourier: CourierSlug;
  handleCourierChange: (courier: CourierSlug) => void;
  areaId: string;
  setAreaId: (value: string) => void;
  selectedArea: RedxArea | null;
  setSelectedArea: (area: RedxArea | null) => void;

  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;

  notice: string;
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;

  couriers: CourierOption[];
  couriersLoading: boolean;
  courierLoadError: string;
  selectedCourierData: CourierOption | undefined;

  validItemsCount: number;
  subtotal: number;
  deliveryCharge: number;
  estimatedTotal: number;
};

function formatPrice(amount: number) {
  return `৳${amount.toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20";

const labelClass =
  "mb-1.5 block text-xs font-medium text-slate-700";

const cardClass =
  "overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-slate-900/[0.06]";

function StepHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-slate-100 px-4 py-3">
      <span
        aria-hidden="true"
        className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white"
      >
        {step}
      </span>

      <div className="min-w-0">
        <h2 className="text-sm font-semibold leading-5 tracking-tight text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-0.5 text-xs text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium tabular-nums text-slate-900">
        {children}
      </span>
    </div>
  );
}

const paymentOptions: {
  value: PaymentMethod;
  title: string;
  description: string;
}[] = [
  {
    value: "cod",
    title: "Cash on Delivery",
    description: "Pay when your order arrives.",
  },
  {
    value: "aamarpay",
    title: "Online payment (aamarPay)",
    description:
      "Continue to the secure aamarPay payment page.",
  },
  {
    value: "sslcommerz",
    title: "Online payment (SSLCommerz)",
    description:
      "Pay through the SSLCommerz sandbox checkout.",
  },
];

export default function CheckoutForm({
  items,
  isGuest,
  cartLoading,
  fullName,
  setFullName,
  phone,
  setPhone,
  address,
  setAddress,
  selectedCourier,
  handleCourierChange,
  areaId,
  setAreaId,
  selectedArea,
  setSelectedArea,
  paymentMethod,
  setPaymentMethod,
  notice,
  isSubmitting,
  handleSubmit,
  couriers,
  couriersLoading,
  courierLoadError,
  selectedCourierData,
  validItemsCount,
  subtotal,
  deliveryCharge,
  estimatedTotal,
}: Props) {
  const redxAvailable = couriers.some(
    (courier) => courier.slug === "redx"
  );

  const steadfastAvailable = couriers.some(
    (courier) => courier.slug === "steadfast"
  );

  const submitButtonText = (() => {
    if (isSubmitting) {
      if (paymentMethod === "sslcommerz") {
        return "Connecting to SSLCommerz...";
      }

      if (paymentMethod === "aamarpay") {
        return "Connecting to aamarPay...";
      }

      return "Creating order...";
    }

    if (couriersLoading) {
      return "Loading delivery services...";
    }

    return paymentMethod === "cod"
      ? "Place order"
      : paymentMethod === "sslcommerz"
        ? "Continue to SSLCommerz"
        : "Continue to aamarPay";
  })();

  return (
    <main className="min-h-screen bg-[#FAFAFB] text-[13px] text-slate-900 antialiased">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        {/* Heading */}
        <div className="mb-5">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1 rounded text-xs font-medium text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
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
            Back to cart
          </Link>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-[-0.01em]">
                Checkout
              </h1>

              <p className="mt-0.5 text-xs text-slate-500">
                Confirm your delivery details and review your order.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  cartLoading
                    ? "bg-slate-300"
                    : "bg-emerald-500"
                }`}
              />
              {cartLoading
                ? "Loading cart..."
                : isGuest
                  ? "Guest checkout"
                  : "Account checkout"}
            </span>
          </div>
        </div>

        {cartLoading ? (
          <div
            className={`${cardClass} flex items-center gap-2 px-4 py-6 text-xs text-slate-500`}
            aria-busy="true"
          >
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
            Loading your cart...
          </div>
        ) : (
          <form
            className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px] lg:gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="min-w-0 space-y-4">
              {/* 1. Delivery information */}
              <section className={cardClass}>
                <StepHeader
                  step={1}
                  title="Delivery information"
                />

                <div className="grid gap-3.5 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="fullName"
                      className={labelClass}
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
                      onChange={(event) =>
                        setFullName(event.target.value)
                      }
                      placeholder="Enter recipient's full name"
                      className={`${inputClass} h-9`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="phone"
                      className={labelClass}
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
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      placeholder="01XXXXXXXXX"
                      className={`${inputClass} h-9`}
                    />
                  </div>
                </div>
              </section>

              {/* 2. Courier selection */}
              <section className={cardClass}>
                <StepHeader
                  step={2}
                  title="Choose delivery service"
                  description="Delivery options are available for guest and account checkout."
                />

                <div className="p-4">
                  {couriersLoading && (
                    <p className="rounded-md bg-slate-50 px-3 py-2.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-100">
                      Loading delivery services...
                    </p>
                  )}

                  {courierLoadError && (
                    <div
                      role="alert"
                      className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5"
                    >
                      <p className="text-xs text-rose-800">
                        {courierLoadError}
                      </p>

                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-1.5 rounded text-xs font-medium text-rose-800 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {!couriersLoading &&
                    !courierLoadError &&
                    couriers.length > 0 && (
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {couriers.map((courier) => {
                          const active =
                            selectedCourier === courier.slug;

                          return (
                            <label
                              key={courier.slug}
                              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
                                active
                                  ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="courier"
                                value={courier.slug}
                                checked={active}
                                onChange={() =>
                                  handleCourierChange(courier.slug)
                                }
                                className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                              />

                              <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="text-[13px] font-medium text-slate-900">
                                    {courier.name}
                                  </span>

                                  <span className="text-[13px] font-semibold tabular-nums text-slate-900">
                                    {formatPrice(courier.cost)}
                                  </span>
                                </span>

                                <span className="mt-0.5 block text-xs text-slate-500">
                                  {courier.slug === "redx"
                                    ? "Select a REDX delivery area."
                                    : "Enter your complete delivery address."}
                                </span>

                                <span className="block text-xs text-slate-400">
                                  Delivery charge
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {selectedCourier === "redx" &&
                    redxAvailable ? (
                      <div>
                        <h3 className="text-[13px] font-medium text-slate-900">
                          REDX delivery location
                        </h3>

                        <p className="mb-3 mt-0.5 text-xs text-slate-500">
                          Select the division, district and delivery area.
                        </p>

                        <RedxAreaSelect
                          value={areaId}
                          onChange={setAreaId}
                          onAreaChange={setSelectedArea}
                        />

                        {selectedArea && (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900">
                                Delivery postcode
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-600">
                                {selectedArea.name},{" "}
                                {selectedArea.district_name},{" "}
                                {selectedArea.division_name}
                              </p>
                            </div>

                            <p className="shrink-0 text-base font-semibold tabular-nums text-emerald-700">
                              {selectedArea.post_code}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : selectedCourier === "steadfast" &&
                      steadfastAvailable ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                        <h3 className="text-[13px] font-medium text-slate-900">
                          Steadfast delivery details
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          Enter the recipient&apos;s full address below,
                          including house, road, area, district and a nearby
                          landmark.
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          REDX area IDs and postcodes are not used for
                          Steadfast.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Select an available courier to continue.
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="address"
                      className={labelClass}
                    >
                      Full delivery address *
                    </label>

                    <textarea
                      id="address"
                      name="address"
                      autoComplete="street-address"
                      required
                      maxLength={500}
                      rows={3}
                      value={address}
                      onChange={(event) =>
                        setAddress(event.target.value)
                      }
                      placeholder={
                        selectedCourier === "redx"
                          ? "House, road, area and nearby landmark"
                          : "House, road, area, district and nearby landmark"
                      }
                      className={`${inputClass} resize-y py-2 leading-5`}
                    />

                    <p className="mt-1.5 text-xs leading-5 text-slate-400">
                      Include enough detail so the courier can locate the
                      recipient.
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. Payment method */}
              <section className={cardClass}>
                <StepHeader
                  step={3}
                  title="Payment method"
                  description="Choose how you want to pay."
                />

                <div className="space-y-2.5 p-4">
                  {paymentOptions.map((method) => {
                    const active =
                      paymentMethod === method.value;

                    return (
                      <label
                        key={method.value}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
                          active
                            ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={active}
                          onChange={() =>
                            setPaymentMethod(method.value)
                          }
                          className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                        />

                        <span>
                          <span className="block text-[13px] font-medium text-slate-900">
                            {method.title}
                          </span>

                          <span className="mt-0.5 block text-xs text-slate-500">
                            {method.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Order summary */}
            <aside className="h-fit rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_16px_32px_-24px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/[0.06] lg:sticky lg:top-16">
              <h2 className="text-sm font-semibold tracking-tight">
                Order summary
              </h2>

              <ul className="mt-3 space-y-2.5">
                {items.map((item) => {
                  const product = item.product;

                  if (!product) {
                    return (
                      <li
                        key={item.productId}
                        className="text-xs text-rose-600"
                      >
                        A product in your cart is unavailable.
                      </li>
                    );
                  }

                  return (
                    <li
                      key={item.productId}
                      className="flex gap-2.5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-50 ring-1 ring-inset ring-slate-200/80">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] text-slate-400">
                            No image
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-medium leading-4 text-slate-800">
                          {product.title}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Qty: {item.quantity}
                        </p>
                      </div>

                      <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-900">
                        {formatPrice(
                          product.price * item.quantity
                        )}
                      </p>
                    </li>
                  );
                })}

                {items.length === 0 && (
                  <li className="text-xs text-slate-500">
                    Your cart is empty.
                  </li>
                )}
              </ul>

              <div className="my-3.5 border-t border-slate-100" />

              <div className="space-y-2">
                <SummaryRow label="Subtotal">
                  {formatPrice(subtotal)}
                </SummaryRow>

                <SummaryRow label="Delivery charge">
                  {couriersLoading
                    ? "Loading..."
                    : courierLoadError || !selectedCourierData
                      ? "Unavailable"
                      : formatPrice(deliveryCharge)}
                </SummaryRow>

                <SummaryRow label="Courier">
                  {selectedCourierData?.name ?? "Not selected"}
                </SummaryRow>

                {selectedCourier === "redx" &&
                  selectedArea && (
                    <SummaryRow label="Postcode">
                      {selectedArea.post_code}
                    </SummaryRow>
                  )}
              </div>

              <div className="my-3.5 border-t border-slate-100" />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="block text-[13px] font-semibold">
                    Estimated total
                  </span>

                  <span className="block text-xs text-slate-400">
                    Products + delivery
                  </span>
                </div>

                <span className="text-base font-semibold tabular-nums tracking-tight">
                  {couriersLoading ||
                  courierLoadError ||
                  !selectedCourierData
                    ? "—"
                    : formatPrice(estimatedTotal)}
                </span>
              </div>

              {notice && (
                <p
                  role="alert"
                  className="mt-3.5 break-words rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"
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
                  validItemsCount === 0 ||
                  isSubmitting
                }
                className="mt-4 flex h-9 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-[13px] font-medium text-white outline-none transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-slate-900"
              >
                {submitButtonText}
              </button>

              <p className="mt-2.5 text-center text-xs leading-5 text-slate-400">
                Guest checkout is supported. Online payments remain pending
                until verified by the payment server.
              </p>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}