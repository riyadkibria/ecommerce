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
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-[13px] transition-colors hover:border-emerald-300">
      {/* Product image */}
      <Link
        href={`/products/${product.id}`}
        aria-label={`View ${title}`}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-slate-100 bg-slate-50 p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="text-xs text-slate-400">No image available</span>
        )}

        {/* Stock badge */}
        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-medium ring-1 ring-inset ${
            inStock
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-rose-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              inStock ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          {inStock ? "In stock" : "Sold out"}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {/* Brand */}
        {product.brand && (
          <p className="mb-0.5 truncate text-xs text-slate-500">
            {product.brand}
          </p>
        )}

        {/* Product title */}
        <Link
          href={`/products/${product.id}`}
          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <h2 className="line-clamp-2 min-h-10 text-[13px] font-medium leading-5 text-slate-900 transition-colors hover:text-emerald-700">
            {title}
          </h2>
        </Link>

        {/* Price and stock status */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold tabular-nums tracking-tight text-slate-900">
            {formatPrice(product.price)}
          </p>

          <span
            className={`shrink-0 text-xs ${
              inStock ? "text-slate-500" : "text-rose-600"
            }`}
          >
            {inStock ? "Available" : "Unavailable"}
          </span>
        </div>

        {/* Separate action area */}
        <div className="mt-auto pt-3">
          {inStock ? (
            <AddToCartButton productId={product.id} />
          ) : (
            <button
              type="button"
              disabled
              className="flex h-8 w-full cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-400"
            >
              Currently unavailable
            </button>
          )}
        </div>
      </div>
    </article>
  );
}