import { useState, useEffect } from "react";

const PARTICLES = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  opacity: Math.random() * 0.5 + 0.1,
  color: Math.random() > 0.88 ? "#ff4d2e" : "#ffffff",
  duration: Math.random() * 5 + 4,
  delay: Math.random() * 6,
}));

type Mode = "login" | "signup";

export default function App() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const handleSubmit = async () => {
    setError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !password) {
    setError("All fields are required.");
    setShake(true);
    setTimeout(() => setShake(false), 500);
    return;
    }

    if (!emailRegex.test(email)) {
    setError("Please enter a valid email address.");
    setShake(true);
    setTimeout(() => setShake(false), 500);
    return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Something went wrong.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      chrome.storage.local.set({ accountToken: data.account_token }, () => {
        window.close();
      });
    } catch {
      setError("Could not reach the Warden server.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setEmail("");
    setPassword("");
  };

  return (
    <div style={styles.root}>
      {/* Starfield */}
      <div style={styles.starfield}>
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: p.color,
              opacity: p.opacity,
              animation: `twinkle ${p.duration}s ${p.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Radial glow behind card */}
      <div style={styles.bgGlow} />

      {/* Card */}
      <div
        style={{
          ...styles.card,
          opacity: mounted ? 1 : 0,
          transform: mounted
            ? shake
              ? "translateY(0) translateX(-6px)"
              : "translateY(0)"
            : "translateY(24px)",
          transition: shake
            ? "transform 0.1s ease"
            : "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        {/* Lock icon */}
        <div style={styles.iconWrap}>
          <div style={styles.iconRing} />
          <div style={styles.iconBox}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect
                x="3" y="11" width="18" height="11" rx="2"
                stroke="#ff4d2e" strokeWidth="1.8"
              />
              <path
                d="M7 11V7a5 5 0 0 1 10 0v4"
                stroke="#ff4d2e" strokeWidth="1.8" strokeLinecap="round"
              />
              <circle cx="12" cy="16" r="1.5" fill="#ff4d2e" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 style={styles.title}>WARDEN</h1>
        <p style={styles.subtitle}>
          {mode === "login"
            ? "Access your lockdown profile."
            : "Create your warden account."}
        </p>

        {/* Mode tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : {}) }}
            onClick={() => switchMode("login")}
          >
            LOG IN
          </button>
          <button
            style={{ ...styles.tab, ...(mode === "signup" ? styles.tabActive : {}) }}
            onClick={() => switchMode("signup")}
          >
            SIGN UP
          </button>
        </div>

        {/* Fields */}
        <div style={styles.fields}>
          <Field
            label="EMAIL"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
          />
          <Field
            label="PASSWORD"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
          />
        </div>

        {/* Error */}
        {error && <p style={styles.error}>{error}</p>}

        {/* Submit */}
        <button
          style={{
            ...styles.submitBtn,
            opacity: isLoading ? 0.7 : 1,
          }}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <span style={styles.spinner} />
          ) : mode === "login" ? (
            "ENTER WARDEN"
          ) : (
            "CREATE ACCOUNT"
          )}
        </button>

        <p style={styles.footer}>WARDEN — SECURE SESSION MANAGER</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #050508; }

        input::placeholder { color: rgba(255,255,255,0.2); }

        button:hover:not(:disabled) {
          background-color: rgba(255,77,46,0.08) !important;
          box-shadow: 0 0 20px rgba(255,77,46,0.2);
        }

        @keyframes twinkle {
          from { opacity: 0.1; transform: scale(1); }
          to   { opacity: 0.7; transform: scale(1.4); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 0.4; }
          50%  { transform: scale(1.12); opacity: 0.15; }
          100% { transform: scale(1);    opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 18px 2px rgba(255,77,46,0.35); }
          50%      { box-shadow: 0 0 34px 6px rgba(255,77,46,0.55); }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...styles.input,
          borderColor: focused ? "rgba(255,77,46,0.8)" : "rgba(255,77,46,0.25)",
          boxShadow: focused
            ? "0 0 0 2px rgba(255,77,46,0.15), inset 0 0 12px rgba(255,77,46,0.05)"
            : "none",
          outline: "none",
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    backgroundColor: "#050508",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Rajdhani', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  starfield: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  bgGlow: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse at center, rgba(255,77,46,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 10,
    width: "100%",
    maxWidth: 420,
    margin: "0 16px",
    backgroundColor: "rgba(10,8,14,0.88)",
    border: "1px solid rgba(255,77,46,0.2)",
    borderRadius: 4,
    padding: "44px 40px 36px",
    backdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
  },
  iconWrap: {
    position: "relative",
    width: 72,
    height: 72,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  iconRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "1px solid rgba(255,77,46,0.3)",
    animation: "pulseRing 3s ease-in-out infinite",
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "rgba(255,77,46,0.08)",
    border: "1px solid rgba(255,77,46,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "glowPulse 3s ease-in-out infinite",
  },
  title: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 32,
    letterSpacing: "0.35em",
    color: "#ff4d2e",
    textShadow:
      "0 0 18px rgba(255,77,46,0.7), 0 0 40px rgba(255,77,46,0.3)",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.08em",
    marginBottom: 28,
  },
  tabs: {
    display: "flex",
    width: "100%",
    borderBottom: "1px solid rgba(255,77,46,0.2)",
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    paddingBottom: 10,
    cursor: "pointer",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    letterSpacing: "0.15em",
    color: "rgba(255,255,255,0.3)",
    transition: "all 0.2s ease",
    marginBottom: -1,
  },
  tabActive: {
    color: "#ff4d2e",
    borderBottom: "2px solid #ff4d2e",
    textShadow: "0 0 10px rgba(255,77,46,0.5)",
  },
  fields: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    marginBottom: 24,
  },
  label: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.15em",
    color: "rgba(255,77,46,0.7)",
  },
  input: {
    width: "100%",
    backgroundColor: "rgba(255,77,46,0.04)",
    border: "1px solid rgba(255,77,46,0.25)",
    borderRadius: 3,
    padding: "11px 14px",
    color: "rgba(255,255,255,0.85)",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 14,
    letterSpacing: "0.05em",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  error: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#ff4d2e",
    letterSpacing: "0.08em",
    marginBottom: 16,
    textAlign: "center",
  },
  submitBtn: {
    width: "100%",
    padding: "13px 0",
    backgroundColor: "transparent",
    border: "1px solid rgba(255,77,46,0.6)",
    borderRadius: 3,
    color: "#ff4d2e",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 13,
    letterSpacing: "0.2em",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  spinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid rgba(255,77,46,0.3)",
    borderTop: "2px solid #ff4d2e",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  footer: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: "0.2em",
    marginTop: 24,
  },
};