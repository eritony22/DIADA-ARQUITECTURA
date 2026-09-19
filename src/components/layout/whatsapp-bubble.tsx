"use client";

import { motion } from "framer-motion";
import WhatsappIcon from "@/components/icons/whatsapp-icon";

const DEFAULT_WHATSAPP = "51914457116";
const DEFAULT_MESSAGE = "Hola DIADA, quisiera consultar por un proyecto.";

export default function WhatsappBubble({ number }: { number?: string }) {
  const phone = (number || DEFAULT_WHATSAPP).replace(/\D/g, "");
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/60" />
      <WhatsappIcon size={26} />
    </motion.a>
  );
}
