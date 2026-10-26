
import "server-only";

import { createClient } from "@/app/lib/supabase/server";

export async function getCartCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return 0;
  }

  const { data, error } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to fetch cart count:", error.message);
    return 0;
  }

  return (data ?? []).reduce(
    (total, item) => total + Math.max(0, item.quantity ?? 0),
    0
  );
}
