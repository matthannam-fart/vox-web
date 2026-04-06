import { DARK } from "../lib/theme";

interface JoinRequestBannerProps {
  requesterName: string;
  onApprove: () => void;
  onDecline: () => void;
}

export const JoinRequestBanner = ({
  requesterName,
  onApprove,
  onDecline,
}: JoinRequestBannerProps) => {
  return (
    <div
      className="px-3.5 py-2.5"
      style={{
        background: DARK.BG_RAISED,
        borderBottom: `1px solid ${DARK.BORDER}`,
      }}
    >
      <p className="text-[11px] mb-2" style={{ color: DARK.TEXT }}>
        <span className="font-semibold">{requesterName}</span>{" "}
        <span style={{ color: DARK.TEXT_DIM }}>wants to join your team</span>
      </p>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 rounded-md py-1 text-[11px] font-semibold cursor-pointer"
          style={{ background: DARK.ACCENT, color: "white", border: "none" }}
        >
          Approve
        </button>
        <button
          onClick={onDecline}
          className="flex-1 rounded-md py-1 text-[11px] font-medium cursor-pointer"
          style={{
            background: "transparent",
            border: `1px solid ${DARK.BORDER}`,
            color: DARK.TEXT_DIM,
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
};
