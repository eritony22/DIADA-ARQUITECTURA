"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: number): TimeLeft | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function Countdown({ date }: { date: string }) {
  // Interpret the stored date (day only) as end-of-day local time, so the
  // countdown doesn't already read "finalizado" on the draw date itself.
  const target = new Date(`${date}T23:59:59`).getTime();
  // Starts undefined (rather than computing Date.now() during render) so the
  // server-rendered markup and the client's first render match exactly —
  // the real countdown fills in a moment later, client-side only.
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null | undefined>(undefined);

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft(target));
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [target]);

  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (timeLeft === undefined) {
    return (
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-bone/50">
        El sorteo se realiza el {formattedDate}
      </p>
    );
  }

  if (!timeLeft) {
    return (
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-clay">
        El sorteo se realizó el {formattedDate}
      </p>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bone/50">
        El sorteo se realiza el {formattedDate}
      </p>
      <div className="mt-3 flex gap-3">
        <Unit value={timeLeft.days} label="Días" />
        <Unit value={timeLeft.hours} label="Horas" />
        <Unit value={timeLeft.minutes} label="Min" />
        <Unit value={timeLeft.seconds} label="Seg" />
      </div>
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex w-16 flex-col items-center rounded-xl border border-bone/15 bg-bone/5 py-3">
      <span className="font-display text-2xl font-extrabold tabular-nums text-bone">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-bone/50">
        {label}
      </span>
    </div>
  );
}
