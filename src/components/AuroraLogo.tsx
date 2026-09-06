import React from 'react';
import logoLoginAsset from '../assets/logo-login.png';

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
        src={logoLoginAsset}
        alt="AURORA - Igiene & Benessere"
        referrerPolicy="no-referrer"
        className={`${sizeStyles[size]} w-auto max-w-full object-contain`}
        style={{
          filter:
            'drop-shadow(0 1px 2px rgba(10,22,40,0.55)) drop-shadow(0 0 8px rgba(10,22,40,0.3))',
        }}
      />

      {showSubtitle && (
        <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-sky-400/80 mt-1.5">
          Igiene &amp; Benessere
        </span>
      )}
    </div>
  );
};
