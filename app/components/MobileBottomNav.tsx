"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, Grid2X2, ShoppingBag, UserRound } from "lucide-react";

/** How long labels stay visible after a full page load / refresh */
const EXPANDED_MS = 10_000;

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Offer", href: "/offers", icon: Gift },
  { label: "Category", href: "/categories", icon: Grid2X2 },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "Profile", href: "/account", icon: UserRound },
];

type MobileBottomNavProps = {
  /** Optional: shows a badge on the Cart tab when greater than 0 */
  cartCount?: number;
};

export default function MobileBottomNav({ cartCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Expanded (icons + labels) on every full load/refresh, then icon-only.
  const [expanded, setExpanded] = useState(true);
  // Drives the thin countdown line while expanded.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setArmed(true));
    const timer = setTimeout(() => setExpanded(false), EXPANDED_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const activeIndex = navItems.findIndex((item) => isActive(item.href));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
    >
      {/* Soft lift shadow cast upward onto the page */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-x-0 bottom-0 h-28
          bg-gradient-to-t from-slate-900/[0.07] to-transparent
        "
      />

      {/* Full-width bar */}
      <div
        className="
          relative overflow-hidden
          rounded-t-[28px]
          border-t border-white/80
          bg-white/80
          backdrop-blur-2xl backdrop-saturate-[1.8]
          shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.22),0_-1px_0_rgba(15,23,42,0.06)]
          px-2 pt-2
          pb-[max(10px,env(safe-area-inset-bottom))]
        "
      >
        {/* Sheen */}
        <div
          aria-hidden
          className="
            pointer-events-none absolute inset-0
            bg-[radial-gradient(90%_120%_at_50%_-40%,rgba(255,255,255,0.95),transparent_65%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(248,250,252,0.55))]
          "
        />

        {/* Warm champagne bloom behind the active tab area */}
        <div
          aria-hidden
          className="
            pointer-events-none absolute -bottom-10 left-1/2 h-24 w-3/4 -translate-x-1/2
            rounded-full bg-amber-200/30 blur-3xl
          "
        />

        {/* Countdown hairline (visible only while labels are shown) */}
        <div
          aria-hidden
          className={`
            pointer-events-none absolute inset-x-6 top-0 h-[2px]
            transition-opacity duration-500 motion-reduce:hidden
            ${expanded ? "opacity-100" : "opacity-0"}
          `}
        >
          <div className="h-full w-full rounded-full bg-slate-900/[0.06]" />
          <div
            className="
              absolute inset-y-0 left-0 rounded-full
              bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500
              ease-linear
            "
            style={{
              width: armed ? "0%" : "100%",
              transitionProperty: "width",
              transitionDuration: `${EXPANDED_MS}ms`,
            }}
          />
        </div>

        <div className="relative grid grid-cols-5">
          {/* Sliding active pill */}
          {activeIndex >= 0 && (
            <div
              aria-hidden
              className="
                pointer-events-none absolute inset-y-0 left-0
                transition-transform duration-500
                ease-[cubic-bezier(0.34,1.35,0.64,1)]
                motion-reduce:transition-none
              "
              style={{
                width: "20%",
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            >
              <div
                className="
                  mx-1 h-full
                  rounded-[22px]
                  bg-gradient-to-b from-amber-50 to-amber-100/70
                  ring-1 ring-inset ring-amber-200/80
                  shadow-[0_8px_20px_-8px_rgba(217,119,6,0.45),inset_0_1px_0_rgba(255,255,255,0.9)]
                "
              />
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const showBadge = item.href === "/cart" && cartCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className="
                  group relative z-10
                  flex flex-col items-center justify-center
                  rounded-[22px] py-3
                  outline-none
                  focus-visible:ring-2 focus-visible:ring-amber-500/60
                  active:scale-90 transition-transform duration-150
                  motion-reduce:transition-none
                "
              >
                <span className="relative">
                  <Icon
                    size={24}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={`
                      transition-all duration-300 motion-reduce:transition-none
                      ${
                        active
                          ? "-translate-y-px scale-105 text-slate-900"
                          : "text-slate-500 group-hover:text-slate-800"
                      }
                    `}
                  />

                  {showBadge && (
                    <span
                      className="
                        absolute -right-3 -top-2.5
                        flex h-[18px] min-w-[18px] items-center justify-center
                        rounded-full px-1
                        bg-gradient-to-b from-amber-300 to-amber-500
                        text-[9px] font-bold leading-none text-neutral-950
                        ring-2 ring-white
                        shadow-[0_3px_8px_rgba(217,119,6,0.45)]
                      "
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>

                {/* Label: animates open/closed via grid rows (0fr <-> 1fr) */}
                <span
                  aria-hidden
                  className={`
                    grid transition-[grid-template-rows,opacity] duration-500
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    motion-reduce:transition-none
                    ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
                  `}
                >
                  <span className="overflow-hidden">
                    <span
                      className={`
                        block pt-1.5 text-[11px] leading-none tracking-[0.02em]
                        ${
                          active
                            ? "font-bold text-slate-900"
                            : "font-semibold text-slate-600"
                        }
                      `}
                    >
                      {item.label}
                    </span>
                  </span>
                </span>

                {/* Active dot (shown in icon-only mode) */}
                <span
                  aria-hidden
                  className={`
                    absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2
                    rounded-full bg-amber-500
                    shadow-[0_0_6px_rgba(245,158,11,0.8)]
                    transition-all duration-500 motion-reduce:transition-none
                    ${active && !expanded ? "scale-100 opacity-100" : "scale-0 opacity-0"}
                  `}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}