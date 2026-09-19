"use client";

import { motion, useReducedMotion } from "framer-motion";

interface BrandMarkProps {
  className?: string;
  animate?: boolean;
  strokeColor?: string;
  fillColor?: string;
}

/**
 * A vector distillation of the DIADA wordmark's peaked "Λ" motif — used as
 * an interactive brand accent (hero, about, footer) wherever the literal
 * logotype would be too heavy or the wrong background.
 */
export default function BrandMark({
  className,
  animate = true,
  strokeColor = "currentColor",
  fillColor = "currentColor",
}: BrandMarkProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  return (
    <motion.svg
      viewBox="0 0 100 100"
      className={className}
      initial={shouldAnimate ? { opacity: 0, scale: 0.85 } : undefined}
      animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.7, ease: "easeOut" }}
      whileHover={shouldAnimate ? { rotate: 4, scale: 1.04 } : undefined}
    >
      <path
        d="M50 8 L92 88 L64 88 L50 60 L36 88 L8 88 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth={5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <motion.path
        d="M50 46 L64 88 L36 88 Z"
        fill={fillColor}
        style={{ transformOrigin: "50px 74px" }}
        animate={
          shouldAnimate
            ? { y: [0, -3, 0] }
            : undefined
        }
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}
