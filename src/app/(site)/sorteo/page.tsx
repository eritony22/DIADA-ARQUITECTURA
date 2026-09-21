import type { Metadata } from "next";
import Image from "next/image";
import Kicker from "@/components/ui/kicker";
import Reveal from "@/components/ui/reveal";
import Countdown from "@/components/raffle/countdown";
import RaffleClient from "@/components/raffle/raffle-client";
import { getPublicTickets, getRaffleConfig } from "@/lib/raffle";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Sorteo",
  description: "Participa en nuestro sorteo: elige tu número y compra por WhatsApp.",
};

export default async function SorteoPage() {
  const [config, tickets, settings] = await Promise.all([
    getRaffleConfig(),
    getPublicTickets(),
    getSettings(),
  ]);

  return (
    <div className="bg-bone">
      <section className="border-b border-line bg-ink pb-16 pt-36 text-bone md:pt-44">
        <div className="container-diada">
          <Reveal>
            <Kicker>Sorteo</Kicker>
            <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
              {config.title}
            </h1>
            {config.subtitle && (
              <p className="mt-4 max-w-xl text-balance text-lg text-bone/70">{config.subtitle}</p>
            )}
            {config.description && (
              <p className="mt-6 max-w-xl text-balance leading-relaxed text-bone/65">
                {config.description}
              </p>
            )}
            {config.drawDate && <Countdown date={config.drawDate} />}
          </Reveal>
        </div>
      </section>

      {config.media.length > 0 && (
        <section className="py-14">
          <div className="container-diada grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {config.media.map((m, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-line bg-paper">
                {m.type === "video" ? (
                  <video src={m.url} controls className="aspect-video w-full object-cover" />
                ) : (
                  <div className="relative aspect-video w-full">
                    <Image src={m.url} alt={m.caption ?? ""} fill className="object-cover" />
                  </div>
                )}
                {m.caption && <p className="px-4 py-2 text-xs text-stone">{m.caption}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {config.prizes.length > 0 && (
        <section className="border-t border-line py-16">
          <div className="container-diada">
            <Kicker>Premios</Kicker>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {config.prizes.map((p, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-line bg-paper">
                  {p.image && (
                    <div className="relative aspect-[4/3] w-full">
                      <Image src={p.image} alt={p.title} fill className="object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-ink">{p.title}</h3>
                    {p.description && <p className="mt-1 text-sm text-stone">{p.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.rules.length > 0 && (
        <section className="border-t border-line py-16">
          <div className="container-diada">
            <Kicker>Reglas</Kicker>
            <ul className="mt-6 max-w-2xl space-y-3">
              {config.rules.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm text-stone">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="border-t border-line py-16">
        <div className="container-diada">
          <Kicker>Elige tu número</Kicker>
          <div className="mt-6">
            <RaffleClient
              config={config}
              initialTickets={tickets}
              whatsappFallback={settings.company.whatsapp}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
