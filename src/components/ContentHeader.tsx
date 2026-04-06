import { DARK } from "../lib/theme";
import type { Page } from "./Layout";

interface ContentHeaderProps {
  teamName: string | null;
  onNavigate: (page: Page) => void;
}

export const ContentHeader = ({ teamName, onNavigate }: ContentHeaderProps) => {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ borderBottom: `1px solid ${DARK.BORDER_LT}` }}
    >
      <button
        onClick={() => onNavigate("teams")}
        className="flex items-center gap-1 text-[13px] font-semibold cursor-pointer bg-transparent border-none"
        style={{ color: DARK.TEXT }}
      >
        {teamName ?? "No Team"}
        <span className="text-[8px]" style={{ color: DARK.TEXT_FAINT }}>
          &#9660;
        </span>
      </button>
      <button
        onClick={() => onNavigate("settings")}
        className="text-base cursor-pointer bg-transparent border-none"
        style={{ color: DARK.TEXT_DIM }}
      >
        &#9881;
      </button>
    </div>
  );
};
