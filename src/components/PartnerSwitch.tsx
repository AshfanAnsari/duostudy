import { motion } from 'motion/react';
import { sound } from '../lib/audio';

interface PartnerSwitchProps {
  me: string;
  partner: string;
  partnerName?: string;
  viewUser: string;
  onSwitch: (username: string) => void;
  className?: string;
}

/**
 * Animated sliding-pill switch for toggling between your desk and your partner's desk.
 * Built with Framer Motion spring physics, tactile acoustic cues, and live sync indicators.
 */
export default function PartnerSwitch({
  me,
  partner,
  partnerName = 'Partner',
  viewUser,
  onSwitch,
  className = '',
}: PartnerSwitchProps) {
  const isHer = viewUser === partner;

  const handleSelect = (targetUser: string) => {
    if (targetUser === viewUser) return;
    const toHer = targetUser === partner;
    sound.playSwitchDesk(toHer);
    onSwitch(targetUser);
  };

  return (
    <div
      role="group"
      aria-label="Switch between your desk and her desk"
      className={`relative inline-flex items-center gap-1 rounded-full border border-white/85 bg-white/70 p-1.5 shadow-[0_4px_18px_rgba(71,28,43,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl ${className}`}
    >
      {/* "You" Desk Button */}
      <motion.button
        type="button"
        onClick={() => handleSelect(me)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-1.5 font-sans text-[12.5px] font-bold transition-colors duration-200 cursor-pointer ${
          !isHer ? 'text-white' : 'text-[#6B5588] hover:text-[#241830]'
        }`}
      >
        {!isHer && (
          <motion.div
            layoutId="partner-desk-slider-pill"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#241830] to-[#3B2050] shadow-[0_4px_16px_rgba(36,24,48,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]"
            transition={{ type: 'spring', stiffness: 500, damping: 33 }}
          />
        )}
        <span className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
          👤
        </span>
        <span className="relative z-10 tracking-tight">Your Desk</span>
      </motion.button>

      {/* "Her" Desk Button */}
      <motion.button
        type="button"
        onClick={() => handleSelect(partner)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-1.5 font-sans text-[12.5px] font-bold transition-colors duration-200 cursor-pointer ${
          isHer ? 'text-white' : 'text-[#6B5588] hover:text-[#241830]'
        }`}
      >
        {isHer && (
          <motion.div
            layoutId="partner-desk-slider-pill"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FF2E79] to-[#E03E2D] shadow-[0_4px_20px_rgba(255,46,121,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]"
            transition={{ type: 'spring', stiffness: 500, damping: 33 }}
          />
        )}
        <span className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
          🌸
        </span>
        <span className="relative z-10 tracking-tight">
          {partnerName}'s Desk
        </span>
        {/* Real-time active desk sync dot */}
        <span className="relative z-10 ml-0.5 flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
              isHer ? 'bg-white' : 'bg-[#FF2E79]'
            } opacity-75`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isHer ? 'bg-white' : 'bg-[#FF2E79]'
            }`}
          />
        </span>
      </motion.button>
    </div>
  );
}
