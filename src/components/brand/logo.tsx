import { cn } from "@/lib/cn";

// Aspect ratio of the trimmed wordmark mask (width/height), so the element
// sizes correctly from just a height utility class, like an <img> would.
const LOGO_ASPECT_RATIO = "1876 / 576";

/**
 * Renders the DIADA wordmark as a solid-color shape (`background: currentColor`
 * clipped by a CSS mask) instead of a flat raster image. This lets the logo
 * pick up whatever text color its container sets — white over dark sections,
 * ink over light ones — rather than always showing the same fixed colors and
 * the white box the source photo of the logo was shot against.
 */
export default function Logo({
  className,
  label = "DIADA Arquitectura y Construcción",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-block bg-current", className)}
      style={{
        aspectRatio: LOGO_ASPECT_RATIO,
        maskImage: "url(/images/brand/logo-mask.png)",
        WebkitMaskImage: "url(/images/brand/logo-mask.png)",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "left center",
        WebkitMaskPosition: "left center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
