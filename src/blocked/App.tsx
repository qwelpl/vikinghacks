import { useEffect, useState, useMemo, useRef } from "react";

const LockIcon = () => (
  <svg
    width="38"
    height="38"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// Deterministic particles — no random on each render
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  size: (i % 3) + 2,
  duration: 6 + (i % 9),
  delay: (i * 0.38) % 6,
}));

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const blockedUrl = params.get("url") || "this site";
  const task = params.get("task");

  const [glitching, setGlitching] = useState(false);
  const [siteTitle, setSiteTitle] = useState<string | null>(null);
  const [siteFavicon, setSiteFavicon] = useState<string | null>(null);
  const [excuse, setExcuse] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch the blocked site to get its title and favicon
  useEffect(() => {
    if (!blockedUrl || blockedUrl === "this site") return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(blockedUrl, { signal: controller.signal });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const title = doc.querySelector("title")?.textContent?.trim() || null;
        setSiteTitle(title);
        // Try to get favicon
        const iconEl =
          doc.querySelector<HTMLLinkElement>("link[rel~='icon']") ||
          doc.querySelector<HTMLLinkElement>("link[rel~='shortcut icon']");
        if (iconEl?.href) {
          setSiteFavicon(iconEl.href);
        } else {
          const origin = new URL(blockedUrl).origin;
          setSiteFavicon(`${origin}/favicon.ico`);
        }
      } catch {
        // CORS or network failure — silent
      }
    })();
    return () => controller.abort();
  }, [blockedUrl]);

  useEffect(() => {
    // Initial glitch on load
    const firstGlitch = setTimeout(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 300);
    }, 900);

    // Recurring glitch
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setGlitching(true);
        setTimeout(() => {
          setGlitching(false);
          schedule();
        }, 300);
      }, 3000 + (Math.random() * 2500));
    };
    schedule();

    return () => {
      clearTimeout(firstGlitch);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative flex items-center justify-center">
      {/* Grid */}
      <div className="absolute inset-0 grid-bg" />

      {/* Scanline */}
      <div className="scanline" />

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-red-500 pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animation: `float-particle ${p.duration}s ${p.delay}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 vignette pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center gap-7 px-6 w-full max-w-sm text-center">

        {/* Lock + rings */}
        <div className="relative flex items-center justify-center w-28 h-28 lock-entrance">
          <div className="absolute inset-0 rounded-full border border-red-500/40 ring" />
          <div className="absolute inset-0 rounded-full border border-red-500/30 ring" />
          <div className="absolute inset-0 rounded-full border border-red-500/20 ring" />
          <div className="w-20 h-20 bg-gray-950 border-2 border-red-500 rounded-2xl flex items-center justify-center text-red-400 lock-glow">
            <LockIcon />
          </div>
        </div>

        {/* BLOCKED — glitch */}
        <div className="relative anim-1">
          <h1
            className="text-6xl font-black tracking-[0.18em] text-red-500 select-none"
            style={{
              textShadow:
                "0 0 30px rgba(239,68,68,0.65), 0 0 70px rgba(239,68,68,0.25)",
            }}
          >
            BLOCKED
          </h1>
          {glitching && (
            <>
              <h1 className="absolute inset-0 text-6xl font-black tracking-[0.18em] text-cyan-400 select-none glitch-1">
                BLOCKED
              </h1>
              <h1 className="absolute inset-0 text-6xl font-black tracking-[0.18em] text-fuchsia-500 select-none glitch-2">
                BLOCKED
              </h1>
            </>
          )}
        </div>

        {/* Blocked URL + site info */}
        <div className="anim-2 flex flex-col items-center gap-1.5 px-4 py-2.5 bg-red-950/40 border border-red-800/50 rounded-lg backdrop-blur-sm max-w-full w-full">
          {(siteFavicon || siteTitle) && (
            <div className="flex items-center gap-2">
              {siteFavicon && (
                <img
                  src={siteFavicon}
                  alt=""
                  className="w-4 h-4 rounded-sm opacity-80"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              {siteTitle && (
                <span className="text-gray-300 text-xs truncate max-w-[220px]">{siteTitle}</span>
              )}
            </div>
          )}
          <span className="text-red-400 text-sm font-mono break-all">{blockedUrl}</span>
        </div>

        {/* Subtext */}
        <p className="anim-3 text-gray-500 text-sm leading-relaxed tracking-wide">
          Warden has you locked in.
          <br />
          Stay on task.
        </p>

        {/* Task card */}
        {task && (
          <div className="anim-4 w-full bg-gray-950/90 border border-gray-800 rounded-xl p-5 text-left">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500 dot-pulse" />
              <p className="text-xs text-gray-500 uppercase tracking-widest">
                Focus on this
              </p>
            </div>
            <p className="text-white text-sm leading-relaxed">{task}</p>
          </div>
        )}

        {/* Exception request */}
        <div className="anim-4 w-full flex flex-col gap-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Request an exception
          </p>
          <textarea
            ref={textareaRef}
            value={excuse}
            onChange={(e) => setExcuse(e.target.value)}
            placeholder="Explain why you need access to this site..."
            rows={3}
            className="w-full px-3 py-2.5 bg-gray-950/90 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-700 resize-none focus:outline-none focus:border-red-700 transition-colors"
          />
          <button
            type="button"
            className="w-full py-2 bg-transparent border border-red-800/60 hover:border-red-600 text-red-500 hover:text-red-400 text-xs font-semibold tracking-widest uppercase rounded-xl transition-colors"
          >
            Submit Request
          </button>
        </div>

        {/* Footer */}
        <p className="anim-4 text-gray-700 text-xs tracking-[0.3em] uppercase">
          Warden — Active
        </p>
      </div>
    </div>
  );
}
