import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { DARK } from "../lib/theme";

export const LoginPage = () => {
  const { signInWithEmail, signUp, signInWithGoogle, signInWithMagicLink, loading } =
    useAuthStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (isSignUp) {
      if (!displayName.trim()) {
        setError("Please enter your name");
        return;
      }
      const result = await signUp(email, password, displayName.trim());
      if (result.error) setError(result.error);
      else setInfo("Check your email to confirm your account.");
    } else {
      const result = await signInWithEmail(email, password);
      if (result.error) setError(result.error);
    }
  };

  const handleGoogle = async () => {
    setError("");
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
  };

  const handleMagicLink = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter your email first");
      return;
    }
    const result = await signInWithMagicLink(email);
    if (result.error) setError(result.error);
    else setInfo("Check your email for a sign-in link.");
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: DARK.BG }}
    >
      <div
        className="w-[260px] rounded-[14px] p-6"
        style={{ background: DARK.BG_RAISED }}
      >
        {/* Logo */}
        <div className="text-center mb-4">
          <h1
            className="text-lg font-bold tracking-tight"
            style={{ color: DARK.TEXT }}
          >
            Vox
          </h1>
          <p className="text-xs mt-1" style={{ color: DARK.TEXT_DIM }}>
            {isSignUp ? "Create your account" : "Sign in to Vox"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Display Name (sign-up only) */}
          {isSignUp && (
            <div>
              <label
                className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1"
                style={{ color: DARK.TEXT_FAINT }}
              >
                Display Name
              </label>
              <input
                type="text"
                placeholder="Your Name"
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-[6px] px-2.5 py-[7px] text-xs outline-none"
                style={{
                  background: DARK.BG_RAISED,
                  border: `1px solid ${DARK.BORDER}`,
                  color: DARK.TEXT,
                }}
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label
              className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1"
              style={{ color: DARK.TEXT_FAINT }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[6px] px-2.5 py-[7px] text-xs outline-none"
              style={{
                background: DARK.BG_RAISED,
                border: `1px solid ${DARK.BORDER}`,
                color: DARK.TEXT,
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1"
              style={{ color: DARK.TEXT_FAINT }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[6px] px-2.5 py-[7px] text-xs outline-none"
              style={{
                background: DARK.BG_RAISED,
                border: `1px solid ${DARK.BORDER}`,
                color: DARK.TEXT,
              }}
            />
          </div>

          {/* Error / Info */}
          {error && (
            <p className="text-[11px] text-center" style={{ color: DARK.DANGER }}>
              {error}
            </p>
          )}
          {info && (
            <p className="text-[11px] text-center" style={{ color: DARK.TEAL }}>
              {info}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[6px] py-[9px] text-xs font-semibold text-white cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: loading ? DARK.BORDER : DARK.TEAL,
              color: loading ? DARK.TEXT_FAINT : "white",
            }}
          >
            {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px" style={{ background: DARK.BORDER }} />
          <span className="text-[10px]" style={{ color: DARK.TEXT_FAINT }}>
            or
          </span>
          <div className="flex-1 h-px" style={{ background: DARK.BORDER }} />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          className="w-full rounded-[6px] py-2 text-[11px] font-semibold cursor-pointer mb-2"
          style={{
            background: "transparent",
            border: `1px solid ${DARK.BORDER}`,
            color: DARK.TEXT,
          }}
        >
          Sign in with Google
        </button>

        {/* Magic Link */}
        <button
          onClick={handleMagicLink}
          className="w-full py-1 text-[11px] font-medium cursor-pointer bg-transparent border-none"
          style={{ color: DARK.TEXT_DIM }}
        >
          Email me a link
        </button>

        {/* Toggle sign-in / sign-up */}
        <div className="text-center mt-3">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setInfo("");
            }}
            className="text-[11px] font-medium cursor-pointer bg-transparent border-none"
            style={{ color: DARK.TEAL }}
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
