import type { Mode } from "../types";
import { COLORS } from "../lib/theme";

interface GlowingOrbProps {
  mode: Mode;
  size?: number;
  breathing?: boolean;
}

export const GlowingOrb = ({ mode, size = 30, breathing = false }: GlowingOrbProps) => {
  const color = COLORS[mode];

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer"
      style={{ width: size, height: size }}
    >
      {/* Outer glow */}
      <div
        className={`absolute inset-0 rounded-full ${breathing ? "animate-[orbBreathe_2.5s_ease-in-out_infinite]" : ""}`}
        style={{
          background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
          transform: "scale(1.8)",
        }}
      />
      {/* Main orb */}
      <div
        className="absolute inset-[3px] rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}ee, ${color}, ${color}cc)`,
          boxShadow: `0 0 8px ${color}50, inset 0 -2px 4px ${color}40`,
        }}
      />
    </div>
  );
};
