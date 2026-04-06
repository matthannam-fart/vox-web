import { DARK } from "../lib/theme";

interface LevelMeterProps {
  level: number; // 0.0 - 1.0
  color?: string;
  width?: number;
  height?: number;
}

export const LevelMeter = ({
  level,
  color = "#4caf50",
  width = 60,
  height = 6,
}: LevelMeterProps) => {
  const fillWidth = Math.max(height, Math.round(width * Math.min(1, level)));

  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ width, height, background: DARK.BORDER }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-75"
        style={{ width: fillWidth, background: color }}
      />
    </div>
  );
};
