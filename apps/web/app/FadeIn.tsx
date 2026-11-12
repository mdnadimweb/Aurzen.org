"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

/** Matches --ease-premium in motion.css. */
export const easePremium = [0.22, 1, 0.36, 1] as const;

type FadeInProps = {
  children: ReactNode;
  as?: "div" | "section" | "article";
  className?: string;
  /** Delay in milliseconds, matching the product card stagger. */
  delay?: number;
};

export default function FadeIn({
  children,
  as = "div",
  className,
  delay = 0,
}: FadeInProps) {
  const reduceMotion = useReducedMotion();
  const Component = as === "section" ? motion.section : as === "article" ? motion.article : motion.div;
  const seconds = reduceMotion ? 0 : Math.min(Math.max(delay, 0), 240) / 1000;
  const variants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      // Children such as FadeInMedia start just after their card.
      transition: { duration: reduceMotion ? 0 : 0.45, delay: seconds, delayChildren: seconds + 0.05, ease: easePremium },
    },
  };

  // Server and client both start "hidden" so hydration matches; the reduced-motion
  // stylesheet rule shows [data-fade] content immediately, with no animation.
  return (
    <Component
      className={className}
      data-fade=""
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </Component>
  );
}

/** Soft clip-path reveal for media inside a FadeIn; follows the parent's stagger. */
export function FadeInMedia({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  const variants: Variants = {
    hidden: { clipPath: "inset(8% 6% 8% 6% round 14px)" },
    visible: { clipPath: "inset(0% 0% 0% 0% round 14px)", transition: { duration: reduceMotion ? 0 : 0.7, ease: easePremium } },
  };
  return <motion.div className={className} data-fade-media="" variants={variants}>{children}</motion.div>;
}
