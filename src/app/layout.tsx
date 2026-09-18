import type { Metadata } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "DIADA | Arquitectura y Construcción",
    template: "%s | DIADA Arquitectura y Construcción",
  },
  description:
    "DIADA Arquitectura y Construcción S.A.C. — estudio de arquitectura, construcción de edificios y diseño de interiores en Tarapoto, San Martín, Perú. Proyectos con identidad, técnica y sensibilidad por el entorno.",
  keywords: [
    "arquitectura Tarapoto",
    "construcción San Martín",
    "diseño de interiores Perú",
    "estudio de arquitectura Perú",
    "DIADA arquitectura",
  ],
  authors: [{ name: "DIADA Arquitectura y Construcción S.A.C." }],
  metadataBase: new URL("https://diada-arquitectura.pe"),
  openGraph: {
    title: "DIADA | Arquitectura y Construcción",
    description:
      "Estudio de arquitectura, construcción y diseño de interiores en Tarapoto, San Martín, Perú.",
    siteName: "DIADA Arquitectura y Construcción",
    locale: "es_PE",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bone text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
