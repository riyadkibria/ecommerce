export type Product = {
  id: number | string;
  title?: string | null;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  brand?: string | null;
  image?: string | null;
  category?: string | null;
  category_id?: string | null;
};

export type Category = {
  id: string;
  name: string;
};