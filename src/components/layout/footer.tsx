import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import InstagramIcon from "@/components/icons/instagram-icon";
import BrandMark from "@/components/brand/brand-mark";
import { getSettings } from "@/lib/settings";

export default async function Footer() {
  const { company } = await getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-ink text-bone">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 text-clay/20 md:h-[28rem] md:w-[28rem]">
        <BrandMark className="h-full w-full" animate={false} />
      </div>

      <div className="container-diada relative py-16 md:py-24">
        <div className="grid gap-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <span className="font-display text-3xl font-extrabold tracking-tight">
              DIADA
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-bone/60">
              Estudio de arquitectura y construcción en Tarapoto, San Martín.
              Diseñamos y construimos espacios con identidad propia para la
              Amazonía peruana.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href={`https://instagram.com/${company.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-bone/20 transition-colors hover:border-clay hover:text-clay"
                aria-label="Instagram de DIADA"
              >
                <InstagramIcon size={17} />
              </a>
            </div>
          </div>

          <nav aria-label="Navegación">
            <p className="kicker text-bone/40">Estudio</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/nosotros" className="text-bone/75 hover:text-clay">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="text-bone/75 hover:text-clay">
                  Servicios
                </Link>
              </li>
              <li>
                <Link href="/proyectos" className="text-bone/75 hover:text-clay">
                  Proyectos
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-bone/75 hover:text-clay">
                  Contacto
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="kicker text-bone/40">Contacto</p>
            <ul className="mt-5 space-y-3 text-sm text-bone/75">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-clay" />
                <span>
                  {company.address}
                  <br />
                  {company.city}, {company.region} — {company.country}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="shrink-0 text-clay" />
                <a href={`tel:+51${company.phones[0].replace(/\s/g, "")}`}>
                  {company.phones.join(" / ")}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="shrink-0 text-clay" />
                <a href={`mailto:${company.emails[0]}`} className="break-all">
                  {company.emails[0]}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="kicker text-bone/40">Empresa</p>
            <ul className="mt-5 space-y-3 text-sm text-bone/75">
              <li>{company.legalName}</li>
              <li>RUC {company.ruc}</li>
              <li>{company.instagram}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-bone/10 pt-8 text-xs text-bone/40 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {company.legalName}. Todos los derechos reservados.
          </p>
          <Link href="/admin/login" className="transition-colors hover:text-bone/70">
            Acceso administrador
          </Link>
        </div>
      </div>
    </footer>
  );
}
