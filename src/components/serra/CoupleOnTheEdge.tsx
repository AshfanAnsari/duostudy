import { useState, useEffect } from 'react';

interface CoupleOnTheEdgeProps {
  progress?: number; // 0 to 1 for continuous scrubber (optional)
  alwaysVisible?: boolean; // For stillness mode
}

export default function CoupleOnTheEdge({ progress = 1, alwaysVisible = false }: CoupleOnTheEdgeProps) {
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [liked, setLiked] = useState(false);

  // Calculate entry opacity and translateY based on progress ∈ [0.82, 1.0]
  // 0.82 -> 0.0 opacity, 0.92 to 1.0 -> 1.0 opacity
  let opacity = 1;
  let translateY = 0;

  if (!alwaysVisible) {
    if (progress < 0.82) {
      opacity = 0;
      translateY = 40;
    } else if (progress < 0.92) {
      const t = (progress - 0.82) / 0.1;
      opacity = t * t * (3 - 2 * t);
      translateY = (1 - opacity) * 36;
    } else {
      opacity = 1;
      translateY = 0;
    }
  }

  const handleCoupleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setLiked(true);
    const newHeart = {
      id: Date.now() + Math.random(),
      x: clickX + (Math.random() * 30 - 15),
      y: clickY - 20,
    };
    setHearts((prev) => [...prev.slice(-6), newHeart]);
  };

  useEffect(() => {
    if (hearts.length > 0) {
      const timer = setTimeout(() => {
        setHearts((prev) => prev.slice(1));
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [hearts]);

  if (!alwaysVisible && opacity < 0.01) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-40 flex flex-col items-center justify-end overflow-visible select-none transition-all duration-300"
      style={{
        opacity,
        transform: `translate3d(0, ${translateY}px, 0)`,
      }}
    >
      <style>{`
        @keyframes gentle-breathe {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-3.5px) scale(1.008); }
        }
        @keyframes leg-swing-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(7deg); }
        }
        @keyframes leg-swing-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg); }
        }
        @keyframes wind-breeze {
          0%, 100% { transform: skewX(0deg) scaleY(1); }
          50% { transform: skewX(-4deg) scaleY(1.02); }
        }
        @keyframes lantern-glow {
          0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 12px rgba(255, 190, 118, 0.75)); }
          50% { opacity: 1; filter: drop-shadow(0 0 24px rgba(255, 204, 138, 0.95)); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.3); }
        }
        @keyframes shooting-star {
          0% { transform: translate(-80px, -40px) scale(0); opacity: 0; }
          15% { opacity: 1; transform: translate(40px, 20px) scale(1); }
          100% { transform: translate(320px, 160px) scale(0.2); opacity: 0; }
        }
        @keyframes float-heart {
          0% { opacity: 1; transform: translate3d(0, 0, 0) scale(0.7); }
          100% { opacity: 0; transform: translate3d(0, -90px, 0) scale(1.4); }
        }
        .anim-breathe {
          animation: gentle-breathe 4.8s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .anim-swing-l {
          animation: leg-swing-left 4.2s ease-in-out infinite;
          transform-origin: 185px 230px;
        }
        .anim-swing-r {
          animation: leg-swing-right 4.6s ease-in-out infinite 0.6s;
          transform-origin: 275px 230px;
        }
        .anim-breeze {
          animation: wind-breeze 3.4s ease-in-out infinite;
          transform-origin: bottom left;
        }
        .anim-lantern {
          animation: lantern-glow 2.8s ease-in-out infinite;
        }
      `}</style>

      {/* Floating Starlight Motes in the Night Horizon */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 h-48 overflow-hidden">
        {/* Shooting star effect */}
        <div
          className="absolute left-[15%] top-6 h-[2px] w-[90px] rounded-full bg-gradient-to-r from-transparent via-[#ffdca8] to-white"
          style={{
            animation: 'shooting-star 8s cubic-bezier(0.16, 1, 0.3, 1) infinite 2.5s',
            filter: 'drop-shadow(0 0 6px #ffdca8)',
          }}
        />

        {/* Ambient star specks */}
        <div
          className="absolute left-[28%] top-16 h-1 w-1 rounded-full bg-[#fdecd5]"
          style={{ animation: 'star-twinkle 3.2s ease-in-out infinite 0.4s' }}
        />
        <div
          className="absolute right-[22%] top-8 h-1.5 w-1.5 rounded-full bg-[#f7d794]"
          style={{ animation: 'star-twinkle 4.1s ease-in-out infinite 1.2s' }}
        />
        <div
          className="absolute left-[44%] top-4 h-1 w-1 rounded-full bg-[#fff]"
          style={{ animation: 'star-twinkle 2.9s ease-in-out infinite 2.1s' }}
        />
        <div
          className="absolute right-[36%] top-20 h-1 w-1 rounded-full bg-[#fdecd5]"
          style={{ animation: 'star-twinkle 3.7s ease-in-out infinite 1.8s' }}
        />
      </div>

      {/* Heart float animation on click */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="pointer-events-none absolute text-[20px]"
          style={{
            left: h.x,
            top: h.y,
            animation: 'float-heart 2.2s ease-out forwards',
          }}
        >
          ❤️
        </div>
      ))}

      {/* Centerpiece Couple Illustration on Stone Edge */}
      <div
        onClick={handleCoupleClick}
        title="Rest at the edge of the canyon (Click for heart)"
        className="pointer-events-auto group relative cursor-pointer flex flex-col items-center"
      >
        {/* Poetic Whisper Badge */}
        <div className="mb-2 flex items-center gap-2 rounded-full border border-[#d9a58840] bg-[#1a130dd0] px-4 py-1.5 text-[11px] font-medium tracking-[0.12em] text-[#f7d794] shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md transition group-hover:border-[#d9a58890] group-hover:bg-[#251b12] active:scale-95">
          <span className="text-[#ffdca8]">✦</span>
          <span>At the edge of the canyon · Two desks, one horizon</span>
          <span className="text-[12px] opacity-75">✨</span>
        </div>

        {/* SVG Artwork: Silhouette Couple Sitting on Stone Edge */}
        <svg
          viewBox="0 0 520 310"
          className="h-[210px] sm:h-[260px] w-auto max-w-[94vw] overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Stone Edge Horizon Gradient */}
            <linearGradient id="stoneLedge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2c1e17" />
              <stop offset="14%" stopColor="#1c130e" />
              <stop offset="100%" stopColor="#0d0806" />
            </linearGradient>

            {/* Cliff Rim Warm Twilight Highlight */}
            <linearGradient id="rimLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="35%" stopColor="#d9a588" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ffbe76" stopOpacity="0.95" />
              <stop offset="65%" stopColor="#d9a588" stopOpacity="0.8" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Figures Silhouette Gradient with Warm Sunset Backlight */}
            <linearGradient id="boySil" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3d2a20" />
              <stop offset="60%" stopColor="#221610" />
              <stop offset="100%" stopColor="#120c09" />
            </linearGradient>

            <linearGradient id="girlSil" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#442e23" />
              <stop offset="60%" stopColor="#261811" />
              <stop offset="100%" stopColor="#140d09" />
            </linearGradient>

            {/* Warm Amber Lantern Glow Radial */}
            <radialGradient id="lanternRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffeaa7" stopOpacity="1" />
              <stop offset="40%" stopColor="#f39c12" stopOpacity="0.7" />
              <stop offset="85%" stopColor="#d35400" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ── Lantern on the Stone Beside Them (Left) ── */}
          <g transform="translate(112, 184)" className="anim-lantern">
            {/* Ambient radiant halo */}
            <circle cx="16" cy="18" r="44" fill="url(#lanternRadial)" />

            {/* Lantern housing */}
            <path
              d="M10 10 L22 10 L26 26 L6 26 Z"
              fill="#19110b"
              stroke="#e67e22"
              strokeWidth="1.5"
            />
            {/* Glowing flame core */}
            <circle cx="16" cy="19" r="4.5" fill="#fff" />
            <path
              d="M16 11 Q17.5 15 16 19 Q14.5 15 16 11 Z"
              fill="#ffbe76"
            />
            {/* Lantern top cap & ring handle */}
            <path d="M12 10 L16 5 L20 10 Z" fill="#2c1e17" stroke="#e67e22" strokeWidth="1" />
            <circle cx="16" cy="3.5" r="3.5" stroke="#f39c12" strokeWidth="1" fill="none" />
            {/* Lantern base */}
            <rect x="5" y="26" width="22" height="4" rx="1.5" fill="#140c08" />

            {/* Cozy study notebook resting on stone */}
            <path d="M-22 24 L4 24 L2 29 L-24 29 Z" fill="#3a271d" />
            <path d="M-20 23 L2 23" stroke="#d9a588" strokeWidth="1.5" />
          </g>

          {/* ── Dangling Legs (Animated over the stone ledge) ── */}
          {/* Girl's Dangling Legs (Left) */}
          <g className="anim-swing-l">
            {/* Left leg */}
            <path
              d="M216 220 C216 238, 214 262, 212 284 C211 292, 214 296, 222 297 C227 298, 228 293, 226 288 C224 266, 226 238, 227 220 Z"
              fill="#1f140e"
            />
            {/* Right leg dangling forward */}
            <path
              d="M232 220 C234 238, 235 264, 238 286 C239 294, 243 298, 251 298 C256 298, 256 292, 252 288 C247 266, 243 238, 241 220 Z"
              fill="#2b1b13"
            />
          </g>

          {/* Boy's Dangling Legs (Right) */}
          <g className="anim-swing-r">
            {/* Left leg */}
            <path
              d="M272 220 C271 238, 269 265, 266 288 C265 296, 268 301, 277 302 C283 303, 283 296, 281 290 C279 268, 282 238, 283 220 Z"
              fill="#1b120c"
            />
            {/* Right leg */}
            <path
              d="M290 220 C293 238, 296 265, 300 289 C302 297, 307 301, 316 300 C322 299, 321 293, 316 289 C310 268, 305 238, 303 220 Z"
              fill="#261911"
            />
          </g>

          {/* ── Couple Torso, Heads & Arms (Gentle Breathing Animation) ── */}
          <g className="anim-breathe">
            {/* Boy Body (Sitting on Right) */}
            {/* Boy Torso */}
            <path
              d="M260 162 C262 142, 280 134, 302 138 C324 142, 334 158, 330 198 C328 214, 322 224, 262 224 Z"
              fill="url(#boySil)"
            />
            {/* Boy Arm reaching gently toward her */}
            <path
              d="M270 168 C260 178, 250 198, 254 220 C258 221, 266 221, 268 212 C268 200, 274 184, 280 174 Z"
              fill="#1f140e"
            />
            {/* Boy Head & Hair */}
            <ellipse cx="304" cy="116" rx="19" ry="21" fill="url(#boySil)" />
            {/* Boy Hair with subtle texture */}
            <path
              d="M285 116 C285 99, 298 94, 318 97 C326 98, 330 108, 326 120 C322 110, 316 104, 304 104 C292 104, 286 110, 285 116 Z"
              fill="#120a06"
            />

            {/* Girl Body (Sitting on Left, leaning head on his shoulder) */}
            {/* Girl Torso */}
            <path
              d="M208 170 C212 148, 230 142, 256 148 C276 152, 282 174, 278 204 C276 218, 268 224, 208 224 Z"
              fill="url(#girlSil)"
            />
            {/* Girl Arm resting on stone */}
            <path
              d="M210 176 C198 188, 188 204, 186 221 C192 222, 199 221, 203 214 C205 202, 212 190, 218 182 Z"
              fill="#221610"
            />
            {/* Girl Head leaning rightward gently onto Boy's shoulder */}
            <g transform="translate(262, 126) rotate(18)">
              <ellipse cx="0" cy="0" rx="17.5" ry="19.5" fill="url(#girlSil)" />
              {/* Girl Hair ponytail/flowing in wind */}
              <path
                d="M-18 -2 C-18 -18, -4 -21, 14 -18 C22 -16, 24 -6, 20 4 C16 -4, 10 -11, -2 -11 C-12 -11, -16 -4, -18 -2 Z"
                fill="#120a06"
              />
              <path
                className="anim-breeze"
                d="M-17 4 C-26 14, -32 30, -38 46 C-34 46, -30 40, -26 28 C-22 18, -18 12, -15 8 Z"
                fill="#140c08"
              />
            </g>

            {/* Hands Touching / Intertwined on Stone Edge */}
            <ellipse cx="258" cy="221" rx="9" ry="5.5" fill="#3a251b" />

            {/* Warm Golden Sunset Rim Light on Heads & Shoulders */}
            <path
              d="M285 112 C288 98, 304 94, 320 98"
              stroke="#ffdca8"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M242 118 C250 108, 266 112, 276 122"
              stroke="#ffdca8"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
          </g>

          {/* ── Massive Sandstone Ledge / Cliff Edge (Foreground) ── */}
          {/* Ledge top glowing rim line */}
          <path
            d="M0 220 L520 220"
            stroke="url(#rimLight)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Cliff rock face extending to bottom of viewport */}
          <path
            d="M0 220 L520 220 L520 310 L0 310 Z"
            fill="url(#stoneLedge)"
          />
          {/* Natural rock strata / texture marks */}
          <path
            d="M20 236 Q180 234 320 238 Q440 235 500 238"
            stroke="#3e2a1f"
            strokeWidth="1.2"
            opacity="0.6"
          />
          <path
            d="M60 258 Q220 256 360 260 Q460 257 510 260"
            stroke="#2a1b13"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>

        {/* Small interaction clue */}
        <span className="mt-1 text-[10px] font-sans text-[#d6c8bc]/60 tracking-wider">
          {liked ? 'Two hearts, one rhythm ❤️' : 'Tap to share study warmth 💫'}
        </span>
      </div>
    </div>
  );
}
