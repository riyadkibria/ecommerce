import { createClient } from "@/app/lib/supabase/server";

export type RelatedProduct = {
  id: number;
  title: string;
  price: number;
  image: string | null;
};

export async function getRelatedProducts(
  categoryId: string | null,
  currentProductId: number
): Promise<RelatedProduct[]> {
  if (!categoryId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, title, price, image")
    .eq("category_id", categoryId)
    .neq("id", currentProductId)
    .order("id", { ascending: false })
    .limit(8);

  if (error) {
    console.error("[RELATED_PRODUCTS_ERROR]", error.message);
    return [];
  }

  return (data ?? []) as RelatedProduct[];
}