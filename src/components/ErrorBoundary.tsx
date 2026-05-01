import { Component, type ErrorInfo, type ReactNode } from "react";
import { DARK } from "../lib/theme";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: DARK.BG }}
        >
          <div
            className="max-w-sm rounded-lg p-5 text-center"
            style={{
              background: DARK.BG_RAISED,
              border: `1px solid ${DARK.BORDER}`,
            }}
          >
            <h1
              className="text-base font-semibold mb-2"
              style={{ color: DARK.TEXT }}
            >
              Something went wrong
            </h1>
            <p
              className="text-xs mb-4"
              style={{ color: DARK.TEXT_DIM }}
            >
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-[6px] px-4 py-2 text-[11px] font-semibold cursor-pointer"
              style={{ background: DARK.TEAL, color: "white", border: "none" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
