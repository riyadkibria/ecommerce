
import Link from "next/link";
import type { Product } from "./type";
import AddToCartButton from "@/app/components/cart/AddToCartButton";

type Props = {
  product: Product;
};

function formatPrice(price: number | string) {
  const amount = Number(price);

  if (!Number.isFinite(amount)) {
    return "Price unavailable";
  }

  return `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ProductCard({ product }: Props) {
  const inStock = Number(product.stock ?? 0) > 0;
  const title = product.title || "Untitled product";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl">
      {/* Product image */}
      <Link
        href={`/products/${product.id}`}
        aria-label={`View ${title}`}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-neutral-50 p-5"
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-sm text-neutral-400">
            No image available
          </span>
        )}

        {/* Stock badge */}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${
            inStock
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {inStock ? "In Stock" : "Sold Out"}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {/* Brand */}
        {product.brand && (
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
            {product.brand}
          </p>
        )}

        {/* Product title */}
        <Link
          href={`/products/${product.id}`}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
        >
          <h2 className="line-clamp-2 min-h-12 text-sm font-semibold leading-6 text-neutral-900 transition-colors hover:text-neutral-600">
            {title}
          </h2>
        </Link>

        {/* Price and stock status */}
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="text-lg font-bold tracking-tight text-neutral-950">
            {formatPrice(product.price)}
          </p>

          <span
            className={`shrink-0 text-xs ${
              inStock ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {inStock ? "Available" : "Unavailable"}
          </span>
        </div>

        {/* Separate action area */}
        <div className="mt-auto pt-4">
          {inStock ? (
            <AddToCartButton productId={product.id} />
          ) : (
            <button
              type="button"
              disabled
              className="flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-400"
            >
              <span aria-hidden="true">−</span>
              Currently Unavailable
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
