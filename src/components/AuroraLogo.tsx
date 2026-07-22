import logoAsset from "@/assets/aurora-logo.png";

export function AuroraLogo({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const heights = {
    sm: "h-8",
    md: "h-10",
    lg: "h-16",
    xl: "h-24",
  };
  return (
    <img
      src={logoAsset}
      alt="Aurora s.r.l.s"
      className={`${heights[size]} w-auto object-contain select-none`}
      draggable={false}
    />
  );
}