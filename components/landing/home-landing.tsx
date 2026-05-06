"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

/** Spokes from center; whole layer rotates — correct transform-origin at hub */
const ORBIT_LAYERS: {
  dots: number;
  radiusVmin: number;
  duration: number;
  reverse?: boolean;
  dotClass: string;
  phaseDeg?: number;
}[] = [
  {
    dots: 5,
    radiusVmin: 12,
    duration: 110,
    reverse: true,
    dotClass: "h-1.5 w-1.5 bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.75)]",
  },
  {
    dots: 8,
    radiusVmin: 22,
    duration: 85,
    dotClass: "h-2 w-2 bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.85)]",
  },
  {
    dots: 6,
    radiusVmin: 34,
    duration: 140,
    reverse: true,
    dotClass: "h-1.5 w-1.5 bg-blue-400/80 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
  },
  { dots: 11, radiusVmin: 46, duration: 175, dotClass: "h-1 w-1 bg-blue-400/55" },
  { dots: 14, radiusVmin: 58, duration: 220, reverse: true, dotClass: "h-1 w-1 bg-blue-500/35" },
];

const RING_DIAMETERS_VMIN = [38, 52, 68, 86, 104, 122];
/** Ring spin periods (s) — 0 = no spin */
const RING_SPIN: (number | 0)[] = [0, 360, 0, 260, 0, 420];

export function HomeLanding() {
  return (
    <div className="home-drift fixed inset-0 z-0 overflow-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(96 165 250) 1px, transparent 0)`,
          backgroundSize: "56px 56px",
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_50%,rgba(59,130,246,0.12),transparent_58%)]" />

      <div className="pointer-events-none absolute left-0 top-0 z-20 max-w-[min(72vw,18rem)] p-6 text-left sm:max-w-md sm:p-8 sm:pr-28">
        <h1 className="text-balance text-sm font-medium leading-snug tracking-tight text-blue-50/95 sm:text-base md:text-lg">
          Build Your Own AI Agents
        </h1>
      </div>

      <header className="pointer-events-auto absolute right-0 top-0 z-20 flex justify-end p-6 sm:p-8">
        <Link
          href="/login"
          className={buttonClassName(
            "outline",
            "sm",
            "border-blue-400/40 bg-blue-500/10 text-blue-50 ring-offset-black hover:border-blue-300/50 hover:bg-blue-500/20 hover:text-white",
          )}
        >
          Login
        </Link>
      </header>

      <div className="absolute left-1/2 top-1/2 z-10 flex h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 items-center justify-center will-change-transform">
        {RING_DIAMETERS_VMIN.map((d, i) => {
          const spin = RING_SPIN[i];
          return (
            <div
              key={d}
              className={`pointer-events-none absolute rounded-full border border-blue-500/20 will-change-transform ${spin ? "home-ring-spin" : "home-pulse"}`}
              style={{
                width: `${d}vmin`,
                height: `${d}vmin`,
                ...(spin
                  ? {
                      animation: `home-orbit ${spin}s linear infinite${i % 2 === 1 ? " reverse" : ""}`,
                    }
                  : {
                      animation: `home-pulse ${5.5 + i * 0.55}s ease-in-out infinite`,
                      animationDelay: `${i * 0.35}s`,
                    }),
              }}
            />
          );
        })}

        {ORBIT_LAYERS.map((layer, li) => (
          <div
            key={li}
            className="home-orbit pointer-events-none absolute inset-0 will-change-transform"
            style={{
              animation: `home-orbit ${layer.duration}s linear infinite${layer.reverse ? " reverse" : ""}`,
            }}
          >
            {Array.from({ length: layer.dots }).map((_, i) => {
              const deg = (360 / layer.dots) * i + (layer.phaseDeg ?? 0);
              return (
                <div
                  key={i}
                  className="absolute left-1/2 bottom-1/2 w-0 origin-bottom"
                  style={{
                    height: `${layer.radiusVmin}vmin`,
                    transform: `translateX(-50%) rotate(${deg}deg)`,
                  }}
                >
                  <div
                    className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full ${layer.dotClass}`}
                  />
                </div>
              );
            })}
          </div>
        ))}

        <div
          className="home-pulse pointer-events-none relative z-10 h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.95),0_0_48px_rgba(59,130,246,0.35)]"
          aria-hidden
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(15,23,42,0.35)_68%,rgba(0,0,0,0.82)_100%)]" />
    </div>
  );
}
