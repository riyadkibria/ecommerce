
import { createClient } from "@/app/lib/supabase/server";
import CheckoutClient from "./CheckoutClient";

export const metadata = {
  title: "Checkout | MyStore",
  description: "Complete your order securely.",
};

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

export default async function CheckoutPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Guest user: browser থেকে localStorage cart লোড হবে।
  // Server Component থেকে localStorage পড়া যায় না।
  if (authError || !user) {
    return <CheckoutClient items={[]} />;
  }

  // Logged-in user: আগের মতো Supabase cart লোড হবে।
  const { data: cartItems, error } = await supabase
    .from("cart_items")
    .select(`
      product_id,
      quantity,
      product:products (
        id,
        title,
        price,
        image,
        stock
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    console.error("Checkout cart query failed:", error.message);

    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="text-xl font-bold">
            Unable to load checkout
          </h1>

          <p className="mt-2 text-sm">
            Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const items: CheckoutItem[] = (cartItems ?? []).map((item) => {
    const product = Array.isArray(item.product)
      ? item.product[0]
      : item.product;

    return {
      productId: String(item.product_id),
      quantity: Number(item.quantity),
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

  // Empty বা invalid authenticated cart হলে cart page-এ ফেরত পাঠাও।
  if (
    items.length === 0 ||
    items.some(
      (item) =>
        !item.product ||
        !Number.isFinite(item.product.price) ||
        item.product.price < 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
    )
  ) {
    const hasInvalidItem = items.some(
      (item) =>
        !item.product ||
        !Number.isFinite(item.product.price) ||
        item.product.price < 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
    );

    if (hasInvalidItem) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <h1 className="text-xl font-bold">
              Unable to verify your cart
            </h1>

            <p className="mt-2 text-sm">
              One or more products are unavailable or have invalid quantities.
              Please return to your cart and review your items.
            </p>

            <a
              href="/cart"
              className="mt-4 inline-block font-semibold underline"
            >
              Return to cart
            </a>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-bold text-slate-900">
            Your cart is empty
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Add a product before proceeding to checkout.
          </p>

          <a
            href="/cart"
            className="mt-4 inline-block font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Return to cart
          </a>
        </div>
      </main>
    );
  }

  return <CheckoutClient items={items} />;
}
