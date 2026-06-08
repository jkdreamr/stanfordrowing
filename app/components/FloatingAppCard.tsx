'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

interface FloatingAppCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

/** Layered card that floats in on view and lifts on hover. */
export default function FloatingAppCard({
  children,
  className = '',
  delay = 0,
  hover = true,
}: FloatingAppCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover && !reduce ? { y: -5 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
}
