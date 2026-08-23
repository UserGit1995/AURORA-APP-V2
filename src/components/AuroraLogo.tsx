import logo from "@/assets/images/aurora-company-logo.png";

interface AuroraLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const heights = {
  sm: "h-8",
  md: "h-11",
  lg: "h-16",
};

export function AuroraLogo({ size = "md", className = "" }: AuroraLogoProps) {
  return (
    <img
      src={logo}
      alt="Aurora"
      className={`${heights[size]} w-auto object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
