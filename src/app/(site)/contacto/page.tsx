import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import InstagramIcon from "@/components/icons/instagram-icon";
import ContactForm from "@/components/forms/contact-form";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escríbenos para cotizar tu proyecto de arquitectura, construcción o diseño de interiores en Tarapoto, San Martín.",
};

export default async function ContactoPage() {
  const { company } = await getSettings();
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    company.mapQuery,
  )}&output=embed`;

  return (
    <div className="bg-bone">
      <section className="border-b border-line bg-ink pb-20 pt-36 text-bone md:pt-44">
        <div className="container-diada">
          <Reveal>
            <Kicker>Hablemos</Kicker>
            <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Cuéntanos sobre tu proyecto
            </h1>
            <p className="mt-6 max-w-xl text-balance leading-relaxed text-bone/70">
              Respondemos por teléfono, correo o Instagram — o completa el
              formulario y te contactamos nosotros.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-diada grid gap-14 lg:grid-cols-[1fr_1.1fr]">
          <Reveal className="space-y-10">
            <div className="rounded-[28px] border border-line bg-paper p-8">
              <p className="kicker text-stone">Información de contacto</p>
              <ul className="mt-6 space-y-5">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-clay" />
                  <span className="text-ink/80">
                    {company.address}
                    <br />
                    {company.city}, {company.region} — {company.country}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="shrink-0 text-clay" />
                  <div className="flex flex-col">
                    {company.phones.map((phone) => (
                      <a
                        key={phone}
                        href={`tel:+51${phone.replace(/\s/g, "")}`}
                        className="text-ink/80 hover:text-ink"
                      >
                        {phone}
                      </a>
                    ))}
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="shrink-0 text-clay" />
                  <div className="flex flex-col">
                    {company.emails.map((email) => (
                      <a
                        key={email}
                        href={`mailto:${email}`}
                        className="break-all text-ink/80 hover:text-ink"
                      >
                        {email}
                      </a>
                    ))}
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <InstagramIcon size={18} className="shrink-0 text-clay" />
                  <a
                    href={`https://instagram.com/${company.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink/80 hover:text-ink"
                  >
                    {company.instagram}
                  </a>
                </li>
              </ul>

              <div className="mt-8 border-t border-line pt-6 text-xs text-stone">
                {company.legalName} · RUC {company.ruc}
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-line">
              <iframe
                src={mapSrc}
                title={`Ubicación de DIADA en ${company.mapQuery}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full grayscale-[15%]"
              />
            </div>
          </Reveal>

          <Reveal delay={0.1} className="rounded-[28px] border border-line bg-paper p-8 md:p-10">
            <p className="kicker text-stone">Formulario</p>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">
              Escríbenos directamente
            </h2>
            <div className="mt-8">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
