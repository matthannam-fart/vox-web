import type { Mode } from "../types";
import { COLORS } from "../lib/theme";

interface StatusOrbProps {
  mode: Mode | "OFFLINE";
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: 10, md: 16, lg: 30 };

export const StatusOrb = ({ mode, size = "md" }: StatusOrbProps) => {
  const px = SIZES[size];
  const color = mode === "OFFLINE" ? "#555555" : COLORS[mode];
  const r = px / 2;

  return (
    <div
      className="relative flex-shrink-0 rounded-full"
      style={{ width: px, height: px }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
          transform: "scale(1.5)",
        }}
      />
      {/* Orb */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}dd, ${color})`,
          boxShadow: `0 0 ${r}px ${color}40`,
        }}
      />
    </div>
  );
};
