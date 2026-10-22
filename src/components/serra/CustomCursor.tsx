import { useEffect, useRef, useState } from 'react';

interface CustomCursorProps {
  hidden?: boolean;
}

export default function CustomCursor({ hidden = false }: CustomCursorProps) {
  const [active, setActive] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isOverExplore, setIsOverExplore] = useState(false);

  const dotPos = useRef({ x: -100, y: -100 });
  const circlePos = useRef({ x: -100, y: -100 });
  const lastTime = useRef(performance.now());
  const dotRef = useRef<HTMLDivElement | null>(null);
  const circleRef = useRef<HTMLDivElement | null>(null);
  const enterLabelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // Only enable for fine pointer with hover
    const isFinePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    if (!isFinePointer || hidden) {
      setActive(false);
      return;
    }

    setActive(true);

    const handlePointerMove = (e: PointerEvent) => {
      dotPos.current = { x: e.clientX, y: e.clientY };

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX - 4}px, ${e.clientY - 4}px, 0)`;
      }

      // Check if hovering interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('a, button, select, [role="button"], input');
        setIsHovering(Boolean(interactive));

        const exploreBtn = target.closest('[data-cursor-enter="true"]');
        setIsOverExplore(Boolean(exploreBtn));
      }
    };

    const handleMouseLeave = () => {
      setActive(false);
    };

    const handleMouseEnter = () => {
      setActive(true);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    let animId: number;

    const renderCircle = (now: number) => {
      const dt = Math.min(50, now - lastTime.current);
      lastTime.current = now;

      // Circle smoothing: 1 - Math.pow(0.82, dt / 16.667)
      const alpha = 1 - Math.pow(0.82, dt / 16.667);
      circlePos.current.x += (dotPos.current.x - circlePos.current.x) * alpha;
      circlePos.current.y += (dotPos.current.y - circlePos.current.y) * alpha;

      if (circleRef.current) {
        circleRef.current.style.transform = `translate3d(${circlePos.current.x}px, ${circlePos.current.y}px, 0)`;
      }

      animId = requestAnimationFrame(renderCircle);
    };

    animId = requestAnimationFrame(renderCircle);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      cancelAnimationFrame(animId);
    };
  }, [hidden]);

  if (!active || hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden select-none">
      {/* 8px Ivory Dot (follows pointer directly) */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 h-[8px] w-[8px] rounded-full bg-[#fffdf8] shadow-[0_0_8px_rgba(255,253,248,0.5)] will-change-transform"
      />

      {/* 36px Thin Outlined Circle (expands to 53px over links) */}
      <div
        ref={circleRef}
        className="fixed top-0 left-0 -ml-[18px] -mt-[18px] flex items-center justify-center will-change-transform"
      >
        <div
          className={`rounded-full border border-[#fffdf8]/60 transition-all duration-200 ease-out flex items-center justify-center ${
            isHovering
              ? 'h-[53px] w-[53px] bg-[#fffdf8]/15 border-[#fffdf8]'
              : 'h-[36px] w-[36px] bg-[#fffdf8]/05'
          }`}
        >
          {/* Over "Explore Serra" tiny "Enter" word beneath circle */}
          {isOverExplore && (
            <span
              ref={enterLabelRef}
              className="absolute -bottom-5 font-sans-serra text-[9px] font-medium uppercase tracking-[0.18em] text-[#fffdf8]"
            >
              Enter
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
