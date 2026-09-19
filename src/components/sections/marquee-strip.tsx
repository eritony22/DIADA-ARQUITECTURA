const ITEMS = [
  "Arquitectura",
  "Construcción",
  "Diseño de Interiores",
  "Consultoría Técnica",
  "Tarapoto · San Martín",
];

export default function MarqueeStrip() {
  const loop = [...ITEMS, ...ITEMS];

  return (
    <div className="overflow-hidden border-y border-line bg-bone-dim py-4">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-stone"
          >
            {item}
            <span className="ml-10 text-clay">&#9670;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
