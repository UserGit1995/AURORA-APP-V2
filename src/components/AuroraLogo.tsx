import React from 'react';

interface AuroraLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'login';
  className?: string;
  showSubtitle?: boolean;
}

export const AuroraLogo: React.FC<AuroraLogoProps> = ({
  size = 'md',
  className = '',
  showSubtitle = false,
}) => {
  const sizeStyles = {
    xs: 'h-6 sm:h-7',
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-16 sm:h-20',
    login: 'h-16 sm:h-20 md:h-24',
  };

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <img
        src="/logo-login.png"
        alt="AURORA Logo"
        referrerPolicy="no-referrer"
        className={`${sizeStyles[size]} w-auto max-w-full object-contain filter drop-shadow-[0_2px_12px_rgba(56,189,248,0.35)]`}
      />

      {showSubtitle && (
        <span className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/90 mt-2 font-mono">
          B2B Supply & Hygiene Solutions
        </span>
      )}
    </div>
  );
};


