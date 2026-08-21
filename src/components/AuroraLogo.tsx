interface AuroraLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AuroraLogo({ size = "md", className = "" }: AuroraLogoProps) {
  const textSizes = {
    sm: "text-lg",
    md: "text-xl tracking-[0.18em]",
    lg: "text-2xl tracking-[0.2em]",
  };

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <span className={`font-logo font-bold uppercase text-white ${textSizes[size]}`}>
        AURORA
      </span>
      <svg
        className="w-6 h-6 -ml-1 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 24C10 24 14 20 18 12C20 8 23 4 27 3C25 8 24 13 21 18C18 23 13 27 6 28C6 26.5 6 25 6 24Z"
          fill="url(#aurora-cyan-grad)"
        />
        <path
          d="M12 25C15 25 18 21 21 16C23 13 25 9 29 7C27 12 26 16 23 20C20 24 16 27 11 27.5C11.3 26.5 11.6 25.5 12 25Z"
          fill="url(#aurora-blue-grad)"
        />
        <defs>
          <linearGradient id="aurora-cyan-grad" x1="6" y1="3" x2="27" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="0.6" stopColor="#0284C7" />
            <stop offset="1" stopColor="#0369A1" />
          </linearGradient>
          <linearGradient id="aurora-blue-grad" x1="11" y1="7" x2="29" y2="27.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7DD3FC" />
            <stop offset="0.5" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
