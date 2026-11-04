"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { RelatedProduct } from "@/app/lib/products/related";

type Props = {
  products: RelatedProduct[];
};

const AUTO_SCROLL_SPEED = 0.025; // Pixels per millisecond: lower = slower
const RESUME_DELAY = 3000;

export default function RelatedProductsCarousel({ products }: Props) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const hoverRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSnap = useCallback((enabled: boolean) => {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.style.scrollSnapType = enabled ? "x proximity" : "none";
  }, []);

  const updateProgress = useCallback(() => {
    const slider = sliderRef.current;
    const bar = progressRef.current;
    if (!slider || !bar) return;

    const maxScroll = slider.scrollWidth - slider.clientWidth;
    const visibleRatio = Math.min(slider.clientWidth / slider.scrollWidth, 1);
    const progress = maxScroll > 0 ? slider.scrollLeft / maxScroll : 0;

    bar.style.width = `${visibleRatio * 100}%`;
    bar.style.transform = `translateX(${
      progress * (1 / visibleRatio - 1) * 100
    }%)`;
  }, []);

  const pauseTemporarily = useCallback(() => {
    pausedRef.current = true;
    setSnap(true);

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
      lastTimeRef.current = null;
    }, RESUME_DELAY);
  }, [setSnap]);

  const slide = useCallback(
    (direction: "left" | "right") => {
      const slider = sliderRef.current;
      if (!slider) return;

      pauseTemporarily();

      const distance = slider.clientWidth * 0.7;
      const maxScroll = slider.scrollWidth - slider.clientWidth;

      // Loop around when manually reaching either end
      if (direction === "right" && slider.scrollLeft >= maxScroll - 4) {
        slider.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      if (direction === "left" && slider.scrollLeft <= 4) {
        slider.scrollTo({ left: maxScroll, behavior: "smooth" });
        return;
      }

      slider.scrollBy({
        left: direction === "right" ? distance : -distance,
        behavior: "smooth",
      });
    },
    [pauseTemporarily]
  );

  // Keep the progress indicator in sync with scroll position
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    let frame: number | null = null;

    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        updateProgress();
      });
    };

    updateProgress();
    slider.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      slider.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateProgress);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [products.length, updateProgress]);

  // Gentle auto-scroll
  useEffect(() => {
    const slider = sliderRef.current;

    if (!slider || products.length < 2) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let isVisible = true;

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        lastTimeRef.current = null;
      },
      { threshold: 0.1 }
    );

    visibilityObserver.observe(slider);

    const animate = (time: number) => {
      const el = sliderRef.current;
      if (!el) return;

      const active =
        !pausedRef.current && !hoverRef.current && isVisible && !document.hidden;

      if (active) {
        setSnap(false);

        if (lastTimeRef.current !== null) {
          const elapsed = Math.min(time - lastTimeRef.current, 32);
          el.scrollLeft += AUTO_SCROLL_SPEED * elapsed;

          const maxScroll = el.scrollWidth - el.clientWidth;

          if (maxScroll > 0 && el.scrollLeft >= maxScroll - 1) {
            el.scrollTo({ left: 0, behavior: "instant" });
          }
        }

        lastTimeRef.current = time;
      } else {
        lastTimeRef.current = null;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastTimeRef.current = null;
      visibilityObserver.disconnect();

      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, [products.length, setSnap]);

  if (products.length === 0) return null;

  const arrowButton =
    "group/btn flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-900 ring-1 ring-inset ring-gray-200 transition-all duration-300 hover:bg-gray-950 hover:text-white hover:ring-gray-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2";

  return (
    <section
      aria-labelledby="related-products-heading"
      className="mt-12 border-t border-gray-200/80 pt-8 sm:mt-16 sm:pt-10"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2
            id="related-products-heading"
            className="text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl"
          >
            You may also like
          </h2>
          <span className="hidden text-sm text-gray-400 sm:inline">
            {products.length} items
          </span>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => slide("left")}
            aria-label="Previous related products"
            className={arrowButton}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 transition-transform duration-300 group-hover/btn:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => slide("right")}
            aria-label="Next related products"
            className={arrowButton}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Slider */}
      <div
        ref={sliderRef}
        onPointerDown={pauseTemporarily}
        onWheel={pauseTemporarily}
        onTouchStart={pauseTemporarily}
        onMouseEnter={() => {
          hoverRef.current = true;
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
          lastTimeRef.current = null;
        }}
        onFocusCapture={() => {
          hoverRef.current = true;
        }}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            hoverRef.current = false;
            lastTimeRef.current = null;
          }
        }}
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        style={{
          overscrollBehaviorX: "contain",
          scrollSnapType: "x proximity",
        }}
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="group relative block w-[44%] shrink-0 snap-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 sm:w-[31%] md:w-[23%] lg:w-[18.5%] xl:w-[16%]"
          >
            <article className="flex h-full flex-col">
              {/* Image */}
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 p-4 ring-1 ring-inset ring-gray-900/[0.05] transition-shadow duration-500 group-hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.35)]">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No image</span>
                )}

                {/* Hover action */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2.5 right-2.5 flex h-8 w-8 translate-y-2 items-center justify-center rounded-full bg-gray-950 text-white opacity-0 shadow-lg transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </span>
              </div>

              {/* Details */}
              <div className="px-0.5 pt-3">
                <h3 className="line-clamp-2 min-h-[2.4rem] text-[13px] font-medium leading-[1.2rem] text-gray-800 transition-colors duration-300 group-hover:text-gray-950">
                  {product.title}
                </h3>

                <p className="mt-1.5 text-[15px] font-semibold tabular-nums tracking-tight text-gray-950">
                  <span className="mr-0.5 font-medium text-gray-400">৳</span>
                  {Number(product.price).toLocaleString("en-BD")}
                </p>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* Scroll progress */}
      <div
        aria-hidden="true"
        className="mx-auto mt-5 h-[2px] w-full max-w-[160px] overflow-hidden rounded-full bg-gray-200"
      >
        <div
          ref={progressRef}
          className="h-full w-1/3 rounded-full bg-gray-950 will-change-transform"
        />
      </div>
    </section>
  );
}