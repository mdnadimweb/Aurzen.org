"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

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

  return (
    <Component
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: reduceMotion ? 0 : 0.45,
        delay: reduceMotion ? 0 : Math.min(Math.max(delay, 0), 240) / 1000,
        ease: "easeOut",
      }}
    >
      {children}
    </Component>
  );
}
