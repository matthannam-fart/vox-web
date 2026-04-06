import { DARK } from "../lib/theme";

interface ToggleSwitchProps {
  on: boolean;
  onToggle: (val: boolean) => void;
}

export const ToggleSwitch = ({ on, onToggle }: ToggleSwitchProps) => {
  return (
    <button
      onClick={() => onToggle(!on)}
      className="relative w-9 h-5 rounded-full cursor-pointer flex-shrink-0 transition-colors"
      style={{
        background: on ? "#2ABFBF" : DARK.BORDER,
        border: "none",
        padding: 0,
      }}
    >
      <div
        className="absolute top-[2px] w-4 h-4 rounded-full bg-white transition-[left] duration-150"
        style={{ left: on ? 18 : 2 }}
      />
    </button>
  );
};
