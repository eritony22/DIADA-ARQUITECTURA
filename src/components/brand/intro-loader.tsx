"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BrandMark from "./brand-mark";

const SESSION_KEY = "diada-intro-played";
const DISPLAY_MS = 1700;

export default function IntroLoader() {
  const [visible, setVisible] = useState(false);

  // Decide once (per session) whether the intro should play. Reading
  // sessionStorage is an external-system read that can only happen after
  // mount, so this can't be done during render — split from the timer
  // effect below so React Strict Mode's dev-only double-invoke of the
  // mount effect can't cancel the timer without ever restarting it.
  useEffect(() => {
    let shouldShow = false;
    try {
      shouldShow = !window.sessionStorage.getItem(SESSION_KEY);
      if (shouldShow) window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable (e.g. privacy mode) — skip intro silently
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read of an external system (sessionStorage), not derived render state
    if (shouldShow) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink"
          initial={{ opacity: 1 }}
          exit={{
            clipPath: "inset(0 0 100% 0)",
            transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] },
          }}
        >
          <motion.div
            className="h-24 w-24 text-bone md:h-32 md:w-32"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <BrandMark className="h-full w-full" fillColor="var(--color-clay)" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
