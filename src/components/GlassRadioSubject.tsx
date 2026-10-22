import { useState } from 'react';
import { motion } from 'motion/react';

export type SubjectName = 'Physics' | 'Chemistry' | 'Biology';

interface GlassRadioSubjectProps {
  value?: SubjectName;
  onChange?: (subject: SubjectName) => void;
  className?: string;
}

const SUBJECTS: { name: SubjectName; count: number; color: string }[] = [
  { name: 'Physics', count: 33, color: '#9333EA' },
  { name: 'Chemistry', count: 28, color: '#F59E0B' },
  { name: 'Biology', count: 32, color: '#E03E2D' },
];

/**
 * Uiverse LilaRest/soft-baboon-75 glass radio component,
 * recolored to the orchid/lavender glass palette.
 * The 3D pearl ball springs out of the vertical glass slab into the selected slot!
 */
export default function GlassRadioSubject({
  value = 'Biology',
  onChange,
  className = '',
}: GlassRadioSubjectProps) {
  const [selected, setSelected] = useState<SubjectName>(value);

  const handleSelect = (s: SubjectName) => {
    setSelected(s);
    onChange?.(s);
  };

  const selectedIndex = SUBJECTS.findIndex((s) => s.name === selected);

  return (
    <div className={`relative flex items-center justify-center p-4 ${className}`}>
      <div className="relative flex items-center gap-6 rounded-[28px] border border-white/80 bg-white/60 p-6 backdrop-blur-xl shadow-[0_20px_50px_-15px_rgba(76,29,149,0.12)]">
        {/* Vertical Glass Slab Column on Left */}
        <div className="relative flex h-[180px] w-[68px] items-center justify-center rounded-[28px] border border-white/90 bg-gradient-to-b from-white/70 via-purple-100/40 to-white/60 p-2 shadow-[0_12px_28px_rgba(76,29,149,0.1),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(76,29,149,0.06)] backdrop-blur-md">
          {/* Inner Recessed Channel */}
          <div className="relative h-full w-full rounded-[22px] border-[5px] border-white/60 bg-purple-200/25 shadow-inner">
            {/* The Rest Pearl Ball waiting inside the slab for unselected positions */}
            <motion.div
              aria-hidden
              className="absolute left-1/2 -translate-x-1/2 h-8 w-8 rounded-full border border-white/90 bg-gradient-to-br from-white via-purple-50 to-purple-200 shadow-[0_6px_14px_rgba(76,29,149,0.2),inset_0_2px_4px_white,inset_0_-2px_4px_rgba(76,29,149,0.15)]"
              animate={{
                top: `${(selectedIndex / 2) * 65 + 12}%`,
              }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 28,
              }}
            />
          </div>
        </div>

        {/* Radio Choices Column on Right */}
        <div className="flex flex-col gap-4">
          <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#7E699B]">
            REVISE TODAY
          </div>

          {SUBJECTS.map((s) => {
            const isChecked = selected === s.name;
            return (
              <label
                key={s.name}
                onClick={() => handleSelect(s.name)}
                className="group flex cursor-pointer items-center gap-3 select-none"
              >
                {/* Radio Ring Slot */}
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-[4px] border-white/80 bg-white/70 shadow-inner transition group-hover:border-white">
                  {/* Indented hollow center */}
                  <div className="h-3 w-3 rounded-full bg-purple-200/40 shadow-inner" />

                  {/* Active 3D Pearl Ball that pops out into this radio circle */}
                  {isChecked && (
                    <motion.div
                      layoutId="spring-radio-ball"
                      className="absolute inset-0 rounded-full border border-white bg-gradient-to-br from-white via-slate-100 to-purple-200 shadow-[0_8px_18px_rgba(76,29,149,0.35),inset_0_2px_4px_white,inset_0_-3px_4px_rgba(76,29,149,0.2)]"
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 26,
                      }}
                    />
                  )}
                </div>

                {/* Subject Name */}
                <span
                  className={`font-sans text-[16px] transition-colors ${
                    isChecked
                      ? 'font-extrabold text-[#1D1427]'
                      : 'font-semibold text-[#6B5B84] group-hover:text-[#1D1427]'
                  }`}
                >
                  {s.name}
                  <span className="ml-2 text-[11px] font-medium text-[#9D8EAD]">
                    ({s.count} ch)
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
