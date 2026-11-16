import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const LoginBackdrop: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="login-grid absolute inset-0" />

      <motion.div
        className="login-glow-primary absolute left-1/2 top-[-12rem] h-[44rem] w-[44rem] -translate-x-1/2 rounded-full lg:left-auto lg:right-[-8%] lg:top-[8%] lg:translate-x-0"
        animate={reduceMotion ? undefined : { opacity: [0.75, 1, 0.75], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
      />

      <motion.div
        className="login-glow-secondary absolute left-[-12%] top-[18%] hidden h-[36rem] w-[36rem] rounded-full lg:block"
        animate={reduceMotion ? undefined : { opacity: [0.6, 0.9, 0.6], x: [0, 24, 0] }}
        transition={{ duration: 15, ease: 'easeInOut', repeat: Infinity }}
      />
    </div>
  );
};
