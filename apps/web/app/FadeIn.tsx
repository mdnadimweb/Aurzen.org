"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Matches --ease-premium in motion.css. */
export const easePremium = [0.22, 1, 0.36, 1] as const;

type FadeInProps = {
  children: ReactNode;
  as?: "div" | "section" | "article";
  className?: string;
  /** Delay in milliseconds, matching the product card stagger. */
  delay?: number;
  "aria-labelledby"?: string;
};

// One shared observer for every reveal on the page. The animation itself is plain CSS
// (motion.css), so shop pages no longer download an animation library just for this.
let observer: IntersectionObserver | null = null;
function reveal(element: Element) {
  if (typeof IntersectionObserver === "undefined") { element.classList.add("is-visible"); return () => {}; }
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer?.unobserve(entry.target); }
  }, { rootMargin: "0px 0px -10% 0px" });
  observer.observe(element);
  return () => observer?.unobserve(element);
}

/** Fades and lifts its content into place the first time it scrolls into view. */
export default function FadeIn({ children, as = "div", className, delay = 0, ...rest }: FadeInProps) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (ref.current) return reveal(ref.current); }, []);
  const Component = as;
  const style = { "--fade-delay": Math.min(Math.max(delay, 0), 240) + "ms" } as CSSProperties;
  return <Component ref={ref as never} className={className} data-fade="" style={style} {...rest}>{children}</Component>;
}

/** Soft clip-path reveal for media inside a FadeIn; follows the parent's stagger. */
export function FadeInMedia({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className} data-fade-media="">{children}</div>;
}
