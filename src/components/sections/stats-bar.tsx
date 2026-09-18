import Reveal from "@/components/ui/reveal";
import type { Stat } from "@/types/content";

export default function StatsBar({ stats }: { stats: Stat[] }) {
  return (
    <section className="border-b border-line bg-paper">
      <div className="container-diada grid grid-cols-2 gap-8 py-14 md:grid-cols-4 md:py-16">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.08}>
            <p className="font-display text-4xl font-extrabold text-ink md:text-5xl">
              {stat.value}
              <span className="text-clay">{stat.suffix}</span>
            </p>
            <p className="kicker mt-3 text-stone">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
