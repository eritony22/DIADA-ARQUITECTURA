import { cn } from "@/lib/cn";

export default function Kicker({
  children,
  className,
  tone = "clay",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "clay" | "stone" | "bone";
}) {
  const toneClass =
    tone === "clay"
      ? "text-clay"
      : tone === "bone"
        ? "text-bone/60"
        : "text-stone";

  return (
    <span className={cn("kicker inline-flex items-center gap-3", toneClass, className)}>
      <span className="h-px w-8 bg-current" />
      {children}
    </span>
  );
}
