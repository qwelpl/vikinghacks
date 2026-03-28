import { useEffect, useState, useCallback } from "react";

type View = "home" | "session";
type SessionMode = "timer" | "completion";

type SessionData = {
  active: boolean;
  task: string;
  allowedHosts: string[];
  mode: SessionMode;
  duration?: number;
  startTime?: number;
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [task, setTask] = useState("");
  const [duration, setDuration] = useState(25);
  const [mode, setMode] = useState<SessionMode>("timer");
  const [loading, setLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);

  const redirectToLogin = useCallback(() => {
  const loginUrl = chrome.runtime.getURL("login/index.html");
    chrome.tabs.create({ url: loginUrl });
    window.close();
  }, []);

  const endSession = useCallback(() => {
    chrome.storage.local.get("session", (data) => {
      const current: SessionData | undefined = data.session;

      chrome.storage.local.set(
        {
          session: {
            ...(current ?? {
              active: false,
              task: "",
              allowedHosts: [],
              mode: "timer",
            }),
            active: false,
            duration: undefined,
            startTime: undefined,
          },
        },
        () => {
          setView("home");
          setSession(null);
        }
      );
    });
  }, []);

  useEffect(() => {
    const updateRemainingTime = (sessionData: SessionData) => {
      if (
        sessionData.active &&
        sessionData.mode === "timer" &&
        sessionData.startTime &&
        sessionData.duration
      ) {
        const elapsedSeconds = (Date.now() - sessionData.startTime) / 1000;
        const totalSessionSeconds = sessionData.duration * 60;
        const remainingSeconds = Math.max(
          0,
          totalSessionSeconds - elapsedSeconds
        );

        if (remainingSeconds <= 0) {
          endSession();
          return;
        }

        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = Math.floor(remainingSeconds % 60);

        setRemainingTime(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      }
    };

    chrome.storage.local.get(["jwt", "session"], (data) => {
      const jwt = data.jwt;
      const sessionData: SessionData | undefined = data.session;

      if (!jwt) {
        redirectToLogin();
        return;
      }

      if (sessionData?.active) {
        setSession(sessionData);
        setTask(sessionData.task ?? "");
        setMode(sessionData.mode ?? "timer");
        setView("session");
        updateRemainingTime(sessionData);
      }

      setLoading(false);
    });

    const interval = setInterval(() => {
      chrome.storage.local.get(["jwt", "session"], (data) => {
        const jwt = data.jwt;

        if (!jwt) {
          clearInterval(interval);
          redirectToLogin();
          return;
        }

        if (data.session?.active) {
          updateRemainingTime(data.session);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [endSession, redirectToLogin]);

  const startSession = () => {
    const trimmedTask = task.trim();
    if (!trimmedTask) return;

    const newSession: SessionData = {
      active: true,
      task: trimmedTask,
      allowedHosts: [],
      mode: mode,
      duration: mode === "timer" ? duration : undefined,
      startTime: mode === "timer" ? Date.now() : undefined,
    };

    chrome.storage.local.set({ session: newSession }, () => {
      setSession(newSession);
      setView("session");
    });
  };

  if (loading) {
    return (
      <div className="w-80 min-h-48 bg-gray-950 text-white p-4 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (view === "session" && session) {
    return (
      <div className="w-80 min-h-48 bg-gray-950 text-white p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-red-400">Warden - Active</h1>
          <span className="text-xs text-gray-500">
            {session.mode === "timer" ? remainingTime : "Locked In"}
          </span>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
          <p className="text-xs text-gray-500 mb-1">Current task</p>
          <p>{task || "No task set"}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs text-gray-500">
          <p>Allowed hosts: none</p>
        </div>

        <button
          onClick={endSession}
          className="mt-auto text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Request to End
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 min-h-48 bg-gray-950 text-white p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <h1 className="text-lg font-bold">Warden</h1>
      </div>

      <p className="text-xs text-gray-400">
        Declare your task, lock in, and only get out when you've proven you're done.
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          What do you need to accomplish?
        </label>
        <textarea
          className="bg-gray-800 rounded-lg p-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-gray-600"
          rows={3}
          placeholder="e.g. Finish chapter 5 problem set"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          Session Mode
        </label>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setMode("timer")}
            className={`flex-1 text-sm py-1 rounded-md ${
              mode === "timer" ? "bg-red-600 text-white" : "text-gray-400"
            }`}
          >
            Timer
          </button>
          <button
            onClick={() => setMode("completion")}
            className={`flex-1 text-sm py-1 rounded-md ${
              mode === "completion" ? "bg-red-600 text-white" : "text-gray-400"
            }`}
          >
            Completion
          </button>
        </div>
      </div>

      {mode === "timer" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Session duration (minutes)
          </label>
          <input
            type="number"
            className="bg-gray-800 rounded-lg p-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
          />
        </div>
      )}

      <button
        onClick={startSession}
        disabled={!task.trim()}
        className="bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold rounded-lg py-2 text-sm transition-colors"
      >
        Start Lockdown
      </button>
    </div>
  );
}