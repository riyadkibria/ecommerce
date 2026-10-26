
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
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="text-xl font-bold">
            Unable to load your cart
          </h1>
          <p className="mt-2 text-sm">
            Please refresh the page and try again.
          </p>
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
