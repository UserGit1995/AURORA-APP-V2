import React, { useEffect, useState } from 'react';

// Sfondi con il logo Aurora che si alternano da soli, con dissolvenza morbida.
const BACKGROUNDS = [
  { src: '/sfondi/sfondo-a.webp', position: 'right bottom' },
  { src: '/sfondi/sfondo-b.webp', position: 'center' },
  { src: '/sfondi/sfondo-c.webp', position: 'center' },
];

// Ogni quanto cambia lo sfondo (in millisecondi): 1 minuto
const INTERVAL_MS = 60000;

export const BackgroundRotator: React.FC = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % BACKGROUNDS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none bg-[#0d1420]">
      {BACKGROUNDS.map((bg, i) => (
        <div
          key={bg.src}
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url(${bg.src})`,
            backgroundPosition: bg.position,
            opacity: i === active ? 1 : 0,
            transition: "opacity 2.5s ease-in-out",
          }}
        />
      ))}
    </div>
  );
};
