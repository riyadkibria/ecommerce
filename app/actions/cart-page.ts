
"use server";

import { createClient } from "@/app/lib/supabase/server";

type CartActionResult = {
  success: boolean;
  message: string;
};

export async function updateCartItemQuantity(
  productId: string,
  quantity: number
): Promise<CartActionResult> {
  if (
    !productId ||
    !Number.isSafeInteger(Number(productId)) ||
    Number(productId) <= 0 ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1
  ) {
    return {
      success: false,
      message: "Invalid product or quantity.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Please log in to update your cart.",
    };
  }

  // Verify that the product exists and check available stock.
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, stock")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    return {
      success: false,
      message: "This product is no longer available.",
    };
  }

  if (
    product.stock !== null &&
    product.stock !== undefined &&
    quantity > product.stock
  ) {
    return {
      success: false,
      message: `Only ${product.stock} units are available.`,
    };
  }

  // Update only this user's cart row.
  const { data: updatedItems, error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .select("product_id");

  if (error) {
    console.error("Cart quantity update failed:", error.message);

    return {
      success: false,
      message: "Could not update the quantity.",
    };
  }

  if (!updatedItems || updatedItems.length === 0) {
    return {
      success: false,
      message: "Cart item not found.",
    };
  }

  return {
    success: true,
    message: "Cart updated successfully.",
  };
}

export async function removeCartItem(
  productId: string
): Promise<CartActionResult> {
  if (
    !productId ||
    !Number.isSafeInteger(Number(productId)) ||
    Number(productId) <= 0
  ) {
    return {
      success: false,
      message: "Invalid product.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Please log in to manage your cart.",
    };
  }

  const { data: deletedItems, error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .select("product_id");

  if (error) {
    console.error("Cart item removal failed:", error.message);

    return {
      success: false,
      message: "Could not remove this product.",
    };
  }

  if (!deletedItems || deletedItems.length === 0) {
    return {
      success: false,
      message: "Cart item not found.",
    };
  }

  return {
    success: true,
    message: "Product removed from cart.",
  };
}
