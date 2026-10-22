import React, { useRef, useState, useCallback } from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  glare?: boolean;
  maxTilt?: number;
  scale?: number;
  borderBeam?: boolean;
  glowColor?: string;
}

/**
 * 21st.dev-style 3D Tilt Card with cursor-tracking perspective rotation,
 * interactive specular glare, and optional border-glow highlight.
 */
export default function Card3D({
  children,
  className = '',
  glare = true,
  maxTilt = 10,
  scale = 1.015,
  borderBeam = false,
  glowColor = 'rgba(240, 98, 146, 0.4)',
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt angles (-maxTilt to +maxTilt)
      const rotY = ((x - centerX) / centerX) * maxTilt;
      const rotX = -((y - centerY) / centerY) * maxTilt;

      setRotate({ x: rotX, y: rotY });

      if (glare) {
        setGlarePos({
          x: (x / rect.width) * 100,
          y: (y / rect.height) * 100,
          opacity: 0.7,
        });
      }
    },
    [glare, maxTilt]
  );

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`relative transition-transform duration-300 ease-out ${className}`}
    >
      <div
        className="relative h-full w-full transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(${scale}, ${scale}, 1)`
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        }}
      >
        {/* Border beam ambient aura on hover */}
        {borderBeam && isHovered && (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-[1px] rounded-[inherit] opacity-80 blur-[8px] transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, ${glowColor}, transparent 70%)`,
            }}
          />
        )}

        {/* Card Content container */}
        <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
          {children}

          {/* Interactive Specular Glare */}
          {glare && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 ease-out"
              style={{
                opacity: glarePos.opacity,
                background: `radial-gradient(circle 280px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.05) 40%, transparent 80%)`,
                mixBlendMode: 'overlay',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
