"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Figtree } from "next/font/google";

const font = Figtree({ subsets: ["latin"], display: "swap" });

/*
  Amazon-style hero, in your own branding:
  1. A full-width banner carousel (auto-plays, arrows, dots).
  2. The banner fades into the page color at the bottom.
  3. A grid of category cards overlaps the banner, each with a 2x2 tile
     preview and a "See more" link.

  All products, labels and offers are sample content. Replace the `slides`,
  `cardsRow1` and `cardsRow2` arrays with your own.
*/

const PAGE_BG = "#EBEEF0";

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

function Icon({
  children,
  className = "h-5 w-5",
  strokeWidth = 1.7,
}: {
  children: React.ReactNode;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Product art                                                               */
/* -------------------------------------------------------------------------- */

type ProductKind =
  | "laptop"
  | "phone"
  | "earbuds"
  | "watch"
  | "speaker"
  | "charger";

function ProductArt({ kind }: { kind: ProductKind }) {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden="true">
      {kind === "laptop" && (
        <g>
          <rect x="44" y="26" width="112" height="76" rx="8" fill="#1F3D33" />
          <rect x="49" y="31" width="102" height="66" rx="4" fill="#2B5244" />
          <circle cx="100" cy="64" r="13" fill="#F4B942" />
          <path
            d="M26 104h148l-6 8a8 8 0 0 1-6 3H38a8 8 0 0 1-6-3z"
            fill="#FFFFFF"
            stroke="#C9D3C6"
          />
        </g>
      )}

      {kind === "phone" && (
        <g>
          <rect x="72" y="14" width="56" height="122" rx="14" fill="#1F3D33" />
          <rect x="76" y="18" width="48" height="114" rx="11" fill="#2B5244" />
          <rect x="91" y="23" width="18" height="4" rx="2" fill="#16302A" />
          <rect x="82" y="38" width="36" height="36" rx="8" fill="#3A6655" />
          <circle cx="100" cy="56" r="8" fill="#F4B942" />
          <rect x="82" y="84" width="30" height="5" rx="2.5" fill="#E7EEE3" />
          <rect x="82" y="95" width="20" height="4" rx="2" fill="#8DA89B" />
          <rect x="82" y="110" width="36" height="14" rx="5" fill="#F4B942" />
        </g>
      )}

      {kind === "earbuds" && (
        <g>
          <rect
            x="52"
            y="48"
            width="96"
            height="64"
            rx="30"
            fill="#FFFFFF"
            stroke="#C9D3C6"
          />
          <path d="M52 76h96" stroke="#E4EADF" />
          <circle cx="100" cy="62" r="3" fill="#F4B942" />
          <rect x="92" y="90" width="16" height="3" rx="1.5" fill="#C9D3C6" />
          <g transform="translate(150 30) rotate(18)">
            <rect
              x="0"
              y="0"
              width="14"
              height="34"
              rx="7"
              fill="#FFFFFF"
              stroke="#C9D3C6"
            />
            <circle cx="7" cy="10" r="3" fill="#F4B942" />
          </g>
        </g>
      )}

      {kind === "watch" && (
        <g>
          <rect x="78" y="8" width="44" height="30" rx="8" fill="#8DA89B" />
          <rect x="78" y="112" width="44" height="30" rx="8" fill="#8DA89B" />
          <rect x="62" y="34" width="76" height="82" rx="22" fill="#1F3D33" />
          <rect x="68" y="40" width="64" height="70" rx="17" fill="#2B5244" />
          <circle
            cx="100"
            cy="75"
            r="19"
            fill="none"
            stroke="#F4B942"
            strokeWidth="5"
          />
          <circle
            cx="100"
            cy="75"
            r="11"
            fill="none"
            stroke="#FBE9BE"
            strokeWidth="3"
          />
          <rect x="138" y="62" width="5" height="14" rx="2.5" fill="#8DA89B" />
        </g>
      )}

      {kind === "speaker" && (
        <g>
          <rect x="56" y="30" width="88" height="96" rx="22" fill="#1F3D33" />
          <circle cx="100" cy="60" r="12" fill="#2B5244" stroke="#3A6655" />
          <circle cx="100" cy="98" r="19" fill="#2B5244" stroke="#3A6655" />
          <circle cx="100" cy="98" r="7" fill="#F4B942" />
          <circle cx="100" cy="60" r="4" fill="#F4B942" />
        </g>
      )}

      {kind === "charger" && (
        <g>
          <rect x="70" y="30" width="60" height="70" rx="14" fill="#FFFFFF" stroke="#C9D3C6" />
          <rect x="86" y="14" width="8" height="18" rx="3" fill="#8DA89B" />
          <rect x="106" y="14" width="8" height="18" rx="3" fill="#8DA89B" />
          <rect x="90" y="52" width="20" height="8" rx="4" fill="#E4EADF" />
          <circle cx="100" cy="82" r="4" fill="#F4B942" />
          <path
            d="M100 100v14c0 10 14 10 14 20"
            fill="none"
            stroke="#1F3D33"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

const slides: {
  title: string;
  text: string;
  cta: string;
  href: string;
  kind: ProductKind;
  gradient: string;
}[] = [
  {
    title: "Good tech, brought to your door.",
    text: "Pay when it arrives or pay online. Delivered by REDX or Steadfast.",
    cta: "Shop now",
    href: "/products",
    kind: "laptop",
    gradient: "from-[#10291F] via-[#1F3D33] to-[#2F7A5C]",
  },
  {
    title: "New phones, no waiting.",
    text: "Order in a few taps and check out as a guest. No account needed.",
    cta: "Browse phones",
    href: "/products",
    kind: "phone",
    gradient: "from-[#0D1B36] via-[#1B3466] to-[#3B5FB0]",
  },
  {
    title: "Sound that goes where you go.",
    text: "Earbuds, speakers and little extras for every day.",
    cta: "Shop audio",
    href: "/products",
    kind: "earbuds",
    gradient: "from-[#2B1D0C] via-[#6B4511] to-[#C28A24]",
  },
];

type Tile = { label: string; kind: ProductKind; bg: string };

type CardData = {
  title: string;
  tiles: Tile[];
  link: string;
  href: string;
};

const cardsRow1: CardData[] = [
  {
    title: "Shop laptops by need",
    link: "See all laptops",
    href: "/products",
    tiles: [
      { label: "Everyday", kind: "laptop", bg: "#E7EEE3" },
      { label: "Student", kind: "laptop", bg: "#F6EED6" },
      { label: "Business", kind: "laptop", bg: "#E2EBEF" },
      { label: "Creator", kind: "laptop", bg: "#F1E6DF" },
    ],
  },
  {
    title: "Phones and accessories",
    link: "Explore phones",
    href: "/products",
    tiles: [
      { label: "Smartphones", kind: "phone", bg: "#E2EBEF" },
      { label: "Chargers", kind: "charger", bg: "#F6EED6" },
      { label: "Smartwatches", kind: "watch", bg: "#F1E6DF" },
      { label: "Earbuds", kind: "earbuds", bg: "#E7EEE3" },
    ],
  },
  {
    title: "Refresh your audio",
    link: "Shop audio",
    href: "/products",
    tiles: [
      { label: "Earbuds", kind: "earbuds", bg: "#F6EED6" },
      { label: "Speakers", kind: "speaker", bg: "#E7EEE3" },
      { label: "Charging cases", kind: "charger", bg: "#E2EBEF" },
      { label: "Wearables", kind: "watch", bg: "#F1E6DF" },
    ],
  },
];

const cardsRow2: CardData[] = [
  {
    title: "Small gadgets, big upgrades",
    link: "See more gadgets",
    href: "/products",
    tiles: [
      { label: "Speakers", kind: "speaker", bg: "#E7EEE3" },
      { label: "Watches", kind: "watch", bg: "#E2EBEF" },
      { label: "Chargers", kind: "charger", bg: "#F6EED6" },
      { label: "Earbuds", kind: "earbuds", bg: "#F1E6DF" },
    ],
  },
  {
    title: "Work and study setups",
    link: "Shop the setup",
    href: "/products",
    tiles: [
      { label: "Laptops", kind: "laptop", bg: "#F6EED6" },
      { label: "Phones", kind: "phone", bg: "#E7EEE3" },
      { label: "Chargers", kind: "charger", bg: "#F1E6DF" },
      { label: "Audio", kind: "earbuds", bg: "#E2EBEF" },
    ],
  },
  {
    title: "Gifts people will use",
    link: "Find a gift",
    href: "/products",
    tiles: [
      { label: "Smartwatches", kind: "watch", bg: "#F1E6DF" },
      { label: "Earbuds", kind: "earbuds", bg: "#E7EEE3" },
      { label: "Speakers", kind: "speaker", bg: "#F6EED6" },
      { label: "Phones", kind: "phone", bg: "#E2EBEF" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Card pieces                                                               */
/* -------------------------------------------------------------------------- */

const cardBase =
  "flex flex-col rounded-md bg-white p-5 shadow-[0_2px_5px_rgba(15,17,17,0.15)]";

function CategoryCard({ title, tiles, link, href }: CardData) {
  return (
    <section className={cardBase} aria-label={title}>
      <h2 className="text-[21px] font-bold leading-7 tracking-[-0.01em] text-[#0F1111]">
        {title}
      </h2>

      <ul className="mt-3 grid flex-1 grid-cols-2 gap-x-4 gap-y-3.5">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={href}
              className="group block rounded outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D33] focus-visible:ring-offset-2"
            >
              <div
                className="aspect-[4/3] w-full overflow-hidden rounded"
                style={{ backgroundColor: tile.bg }}
              >
                <div className="h-full w-full p-[10%] motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-105">
                  <ProductArt kind={tile.kind} />
                </div>
              </div>

              <p className="mt-1.5 text-[12.5px] leading-4 text-[#0F1111] group-hover:text-[#1F3D33] group-hover:underline">
                {tile.label}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="mt-4 inline-block self-start rounded text-[13.5px] font-medium text-[#1F6F55] outline-none hover:text-[#C45500] hover:underline focus-visible:ring-2 focus-visible:ring-[#1F3D33]"
      >
        {link}
      </Link>
    </section>
  );
}

function SignInCard() {
  return (
    <section className={cardBase} aria-label="Sign in">
      <h2 className="text-[21px] font-bold leading-7 tracking-[-0.01em] text-[#0F1111]">
        Sign in for the best experience
      </h2>

      <p className="mt-2 text-[13.5px] leading-5 text-[#565959]">
        Track your orders, see your cart anywhere, and check out faster.
      </p>

      <Link
        href="/login"
        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#F4B942] text-[14px] font-medium text-[#0F1111] outline-none transition hover:bg-[#F0A91C] focus-visible:ring-2 focus-visible:ring-[#1F3D33] focus-visible:ring-offset-2"
      >
        Sign in securely
      </Link>

      <p className="mt-3 text-center text-[12.5px] text-[#565959]">
        New here?{" "}
        <Link
          href="/products"
          className="font-medium text-[#1F6F55] hover:text-[#C45500] hover:underline"
        >
          Shop as a guest
        </Link>
      </p>

      <div className="mt-auto pt-6">
        <ul className="space-y-2 border-t border-[#E7E7E7] pt-4 text-[13px] text-[#0F1111]">
          {[
            "Cash on delivery",
            "REDX and Steadfast couriers",
            "Secure payment with aamarPay",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-[#1F6F55]" strokeWidth={2.2}>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </Icon>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero carousel                                                             */
/* -------------------------------------------------------------------------- */

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex((next + count) % count),
    [count]
  );

  // Respect the visitor's reduced-motion preference.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setReduceMotion(event.matches);

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Auto-play, paused on hover/focus or when reduced motion is on.
  useEffect(() => {
    if (paused || reduceMotion) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, count]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="flex h-[clamp(500px,56vw,700px)] w-full motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
        aria-live={paused ? "polite" : "off"}
      >
        {slides.map((slide, i) => {
          const active = i === index;

          return (
            <div
              key={slide.title}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              className={`relative isolate h-full w-full shrink-0 overflow-hidden bg-gradient-to-br ${slide.gradient} text-white`}
            >
              {/* Soft light */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  backgroundImage:
                    "radial-gradient(ellipse 45% 60% at 80% 35%, rgba(255,255,255,0.18), transparent 70%)",
                }}
              />

              <div className="mx-auto grid h-full w-full max-w-[1500px] items-start gap-6 px-[clamp(1.25rem,5vw,5rem)] pb-[26%] pt-[clamp(2.5rem,7vw,6rem)] md:grid-cols-[1.1fr_1fr] md:items-center md:pb-[18%] md:pt-[3%]">
                <div>
                  <h1
                    className="max-w-[16ch] text-balance text-[clamp(2.2rem,5.2vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-0.035em]"
                    {...(i !== 0 ? { role: "presentation" } : {})}
                  >
                    {slide.title}
                  </h1>

                  <p className="mt-5 max-w-md text-[clamp(1rem,1.4vw,1.2rem)] leading-7 text-white/80">
                    {slide.text}
                  </p>

                  <Link
                    href={slide.href}
                    tabIndex={active ? 0 : -1}
                    className="mt-7 inline-flex h-12 items-center rounded-full bg-[#F4B942] px-8 text-[15px] font-semibold text-[#0F1111] outline-none transition hover:bg-[#F8C965] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                  >
                    {slide.cta}
                  </Link>
                </div>

                <div className="hidden justify-self-center md:block md:w-[min(34vw,480px)]">
                  <div className="aspect-[4/3] w-full rounded-[2rem] bg-[#F5F7F3] p-[8%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/30">
                    <ProductArt kind={slide.kind} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrows (Amazon-style tall edge buttons) */}
      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Previous slide"
        className="absolute left-0 top-[8%] z-10 hidden h-[40%] w-14 items-center justify-center text-white/80 outline-none transition hover:bg-black/15 hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:flex"
      >
        <Icon className="h-9 w-9 rotate-180" strokeWidth={1.4}>
          <path d="m9 5 7 7-7 7" />
        </Icon>
      </button>

      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Next slide"
        className="absolute right-0 top-[8%] z-10 hidden h-[40%] w-14 items-center justify-center text-white/80 outline-none transition hover:bg-black/15 hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:flex"
      >
        <Icon className="h-9 w-9" strokeWidth={1.4}>
          <path d="m9 5 7 7-7 7" />
        </Icon>
      </button>

      {/* Dots */}
      <div className="absolute inset-x-0 top-[calc(100%-clamp(8.5rem,17vw,16.5rem)-2rem)] z-10 flex justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className={`h-2 rounded-full outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white ${
              i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      {/* Fade into the page background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          backgroundImage: `linear-gradient(to bottom, transparent, ${PAGE_BG} 92%)`,
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero section                                                              */
/* -------------------------------------------------------------------------- */

export default function AmazonStyleHero() {
  return (
    <section
      aria-label="Featured"
      className={`${font.className} w-full text-[#0F1111] antialiased`}
      style={{ backgroundColor: PAGE_BG }}
    >
      <HeroCarousel />

      {/* Cards overlap the banner */}
      <div className="relative z-20 mx-auto -mt-[clamp(8.5rem,17vw,16.5rem)] w-full max-w-[1500px] px-[clamp(0.75rem,2vw,1.25rem)] pb-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cardsRow1.map((card) => (
            <CategoryCard key={card.title} {...card} />
          ))}

          <SignInCard />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cardsRow2.map((card) => (
            <CategoryCard key={card.title} {...card} />
          ))}

          {/* Single-image card */}
          <section className={cardBase} aria-label="Today's pick">
            <h2 className="text-[21px] font-bold leading-7 tracking-[-0.01em] text-[#0F1111]">
              Today&apos;s pick
            </h2>

            <Link
              href="/products"
              className="group mt-3 block flex-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D33] focus-visible:ring-offset-2"
            >
              <div className="aspect-[4/3] w-full overflow-hidden rounded bg-[#E7EEE3] lg:aspect-auto lg:h-[calc(100%-1.75rem)] lg:min-h-[180px]">
                <div className="h-full w-full p-[12%] motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-105">
                  <ProductArt kind="laptop" />
                </div>
              </div>

              <p className="mt-1.5 text-[12.5px] text-[#0F1111] group-hover:underline">
                UltraBook Pro 14
              </p>
            </Link>

            <Link
              href="/products"
              className="mt-3 inline-block self-start rounded text-[13.5px] font-medium text-[#1F6F55] outline-none hover:text-[#C45500] hover:underline focus-visible:ring-2 focus-visible:ring-[#1F3D33]"
            >
              Shop now
            </Link>
          </section>
        </div>
      </div>
    </section>
  );
}