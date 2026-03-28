import { useEffect, useState } from "react";

type View = "home" | "session";

type SessionData = {
  active: boolean;
  task: string;
  allowedHosts: string[];
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get("session", (data) => {
      const session: SessionData | undefined = data.session;

      if (session?.active) {
        setTask(session.task ?? "");
        setView("session");
      }

      setLoading(false);
    });
  }, []);

  const startSession = () => {
    const trimmedTask = task.trim();
    if (!trimmedTask) return;

    const session: SessionData = {
      active: true,
      task: trimmedTask,
      allowedHosts: [],
    };

    chrome.storage.local.set({ session }, () => {
      setView("session");
    });
  };

  const endSession = () => {
    chrome.storage.local.get("session", (data) => {
      const current: SessionData | undefined = data.session;

      chrome.storage.local.set(
        {
          session: {
            ...(current ?? {}),
            active: false,
            allowedHosts: [],
          },
        },
        () => {
          setView("home");
        }
      );
    });
  };

  if (loading) {
    return (
      <div className="w-80 min-h-48 bg-gray-950 text-white p-4 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (view === "session") {
    return (
      <div className="w-80 min-h-48 bg-gray-950 text-white p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-red-400">Warden - Active</h1>
          <span className="text-xs text-gray-500">locked</span>
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
          End session
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