
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type AddToCartResult = {
  success: boolean;
  message: string;
};

export async function addToCart(
  productId: number | string,
  quantity: number = 1
): Promise<AddToCartResult> {
  // 1. Validate product ID
  const id = Number(productId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return {
      success: false,
      message: "Invalid product.",
    };
  }

  // 2. Validate quantity
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return {
      success: false,
      message: "Quantity must be between 1 and 99.",
    };
  }

  // 3. Create Supabase server client
  const supabase = await createClient();

  // 4. Verify the logged-in user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Please log in to add products to your cart.",
    };
  }

  // 5. Call the database function
  const { error } = await supabase.rpc("add_to_cart", {
    p_product_id: id,
    p_quantity: quantity,
  });

  if (error) {
    console.error("Add to cart error:", error.message);

    return {
      success: false,
      message: "Could not add product to cart.",
    };
  }

  // 6. Refresh cart-related server-rendered data
  revalidatePath("/cart");
  revalidatePath("/", "layout");

  return {
    success: true,
    message: "Product added to cart successfully.",
  };
}
