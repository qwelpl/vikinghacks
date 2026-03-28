import { useEffect, useState, useCallback } from "react";
import {
  Lock,
  Settings,
  Plus,
  Timer,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";

type View = "home" | "session" | "settings";
type SessionMode = "timer" | "completion";

type SessionData = {
  active: boolean;
  task: string;
  tasks: string[];
  allowedHosts: string[];
  mode: SessionMode;
  duration?: number;
  startTime?: number;
};

type SettingsData = {
  whitelist: string[];
  adminPassword?: string;
};

type Tab = {
  id: number;
  title: string;
  url: string;
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [duration, setDuration] = useState(25);
  const [mode, setMode] = useState<SessionMode>("timer");
  const [loading, setLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [whitelist, setWhitelist] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [currentAdminPassword, setCurrentAdminPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [endSessionPassword, setEndSessionPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showWhitelistPassword, setShowWhitelistPassword] = useState(false);
  const [whitelistPassword, setWhitelistPassword] = useState("");
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<number[]>([]);

  const isValidDomain = (domain: string) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  };

  const endSession = useCallback(() => {
    chrome.storage.local.get("session", (data) => {
      const current: SessionData | undefined = data.session;

      chrome.storage.local.set(
        {
          session: {
            ...(current ?? {
              active: false,
              task: "",
              tasks: [],
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

    chrome.storage.local.get(["session", "settings"], (data) => {
      const sessionData: SessionData | undefined = data.session;
      const settingsData: SettingsData | undefined = data.settings;

      if (sessionData?.active) {
        setSession(sessionData);
        setTask(sessionData.task ?? "");
        setTasks(sessionData.tasks ?? []);
        setView("session");
        updateRemainingTime(sessionData);
      }

      if (settingsData) {
        setWhitelist(settingsData.whitelist.join(", "));
        setAdminPassword(settingsData.adminPassword ?? "");
      }

      setLoading(false);
    });

    chrome.tabs.query({}, (tabs) => {
      setTabs(
        tabs.map((t) => ({ id: t.id!, title: t.title!, url: t.url! }))
      );
    });

    const interval = setInterval(() => {
      chrome.storage.local.get("session", (data) => {
        if (data.session?.active) {
          updateRemainingTime(data.session);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [endSession]);

  const startSession = () => {
    const trimmedTask = task.trim();
    if (!trimmedTask) return;

    chrome.tabs.query({}, (allTabs) => {
      const allowedHosts = allTabs
        .filter((t) => selectedTabs.includes(t.id!))
        .map((t) => new URL(t.url!).hostname);

      const newSession: SessionData = {
        active: true,
        task: trimmedTask,
        tasks: tasks,
        allowedHosts: [...new Set(allowedHosts)],
        mode: mode,
        duration: mode === "timer" ? duration : undefined,
        startTime: mode === "timer" ? Date.now() : undefined,
      };

      chrome.storage.local.set({ session: newSession }, () => {
        setSession(newSession);
        setView("session");
      });
    });
  };

  const saveSettings = () => {
    chrome.storage.local.get("settings", (data) => {
      const settings: SettingsData | undefined = data.settings;

      if (showChangePassword && settings?.adminPassword && currentAdminPassword !== settings.adminPassword) {
        alert("Incorrect current password.");
        return;
      }

      if (!settings?.adminPassword && !newAdminPassword) {
        alert("Please enter a new password.");
        return;
      }

      const whitelistDomains = whitelist
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const domain of whitelistDomains) {
        if (!isValidDomain(domain)) {
          alert(`Invalid domain: ${domain}`);
          return;
        }
      }

      const newSettings: SettingsData = {
        whitelist: whitelistDomains,
        adminPassword: newAdminPassword || settings?.adminPassword,
      };

      chrome.storage.local.set({ settings: newSettings }, () => {
        alert("Settings saved!");
        setView("home");
        setNewAdminPassword("");
        setCurrentAdminPassword("");
        setShowChangePassword(false);
        setShowWhitelistPassword(false);
        setWhitelistPassword("");
      });
    });
  };

  const handleEndSessionRequest = () => {
    setShowPasswordInput(true);
  };

  const handleEndSessionWithPassword = () => {
    chrome.storage.local.get("settings", (data) => {
      const settings: SettingsData | undefined = data.settings;
      if (settings?.adminPassword && endSessionPassword === settings.adminPassword) {
        endSession();
      } else {
        alert("Incorrect password.");
        setEndSessionPassword("");
      }
    });
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
    }
  };

  const handleWhitelistPassword = () => {
    chrome.storage.local.get("settings", (data) => {
      const settings: SettingsData | undefined = data.settings;
      if (settings?.adminPassword && whitelistPassword === settings.adminPassword) {
        setShowWhitelistPassword(true);
      } else {
        alert("Incorrect password.");
        setWhitelistPassword("");
      }
    });
  };

  const handleTabSelection = (tabId: number) => {
    setSelectedTabs(
      selectedTabs.includes(tabId)
        ? selectedTabs.filter((id) => id !== tabId)
        : [...selectedTabs, tabId]
    );
  };

  const renderInput = (
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    placeholder: string,
    type = "text",
    icon?: React.ReactNode
  ) => (
    <div className="relative">
      <input
        type={type}
        className="bg-black bg-opacity-30 border border-red-500/50 rounded-lg p-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-400 w-full"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {icon && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {icon}
        </div>
      )}
    </div>
  );

  const renderTextarea = (
    value: string,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void,
    placeholder: string,
    disabled = false
  ) => (
    <textarea
      className="bg-black bg-opacity-30 border border-red-500/50 rounded-lg p-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
      rows={3}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );

  const renderButton = (
    onClick: () => void,
    text: string,
    disabled = false,
    primary = false,
    icon?: React.ReactNode
  ) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-sm font-semibold rounded-lg py-2 px-4 transition-all duration-300 flex items-center justify-center gap-2 ${
        primary
          ? "bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:from-gray-800 disabled:to-gray-900 disabled:text-gray-600 text-white"
          : "bg-black bg-opacity-30 border border-red-500/50 text-red-400 hover:bg-red-500/20"
      }`}
    >
      {icon}
      {text}
    </button>
  );

  if (loading) {
    return (
      <div className="w-80 min-h-48 bg-black text-white p-4 flex items-center justify-center">
        <p className="text-sm text-gray-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (view === "session" && session) {
    return (
      <div className="w-80 min-h-48 bg-gradient-to-br from-black to-gray-900 text-white p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-red-400 animate-pulse">
            Warden - Active
          </h1>
          <span className="text-xs text-gray-500">
            {session.mode === "timer" ? remainingTime : "Locked In"}
          </span>
        </div>

        <div className="bg-black bg-opacity-30 border border-red-500/50 rounded-lg p-3 text-sm text-gray-300">
          <p className="text-xs text-gray-500 mb-1">Current task</p>
          <p>{task || "No task set"}</p>
        </div>

        {session.tasks.length > 0 && (
          <div className="bg-black bg-opacity-30 border border-red-500/50 rounded-lg p-3 text-sm text-gray-300">
            <p className="text-xs text-gray-500 mb-1">Tasks</p>
            <ul className="list-disc list-inside">
              {session.tasks.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-black bg-opacity-30 border border-red-500/50 rounded-lg p-3 text-xs text-gray-500">
          <p>Allowed hosts: {session.allowedHosts.join(", ")}</p>
        </div>

        {showPasswordInput ? (
          <div className="mt-auto flex gap-2">
            {renderInput(
              endSessionPassword,
              (e) => setEndSessionPassword(e.target.value),
              "Admin password",
              "password"
            )}
            {renderButton(handleEndSessionWithPassword, "End", false, true)}
          </div>
        ) : (
          <button
            onClick={handleEndSessionRequest}
            className="mt-auto text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            Request to End
          </button>
        )}
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className="w-80 min-h-48 bg-gradient-to-br from-black to-gray-900 text-white p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-red-400">Settings</h1>
          <button
            onClick={() => setView("home")}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Whitelisted Domains (CSV)
          </label>
          {adminPassword && !showWhitelistPassword ? (
            renderButton(() => setShowWhitelistPassword(true), "Change Whitelist")
          ) : (
            <>
              {showWhitelistPassword && (
                <div className="flex gap-2">
                  {renderInput(
                    whitelistPassword,
                    (e) => setWhitelistPassword(e.target.value),
                    "Admin password",
                    "password"
                  )}
                  {renderButton(handleWhitelistPassword, "Unlock")}
                </div>
              )}
              {renderTextarea(
                whitelist,
                (e) => setWhitelist(e.target.value),
                "e.g. google.com, wikipedia.org",
                adminPassword && !showWhitelistPassword
              )}
            </>
          )}
        </div>

        {adminPassword ? (
          showChangePassword ? (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Current Admin Password
                </label>
                {renderInput(
                  currentAdminPassword,
                  (e) => setCurrentAdminPassword(e.target.value),
                  "Current password",
                  "password"
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  New Admin Password
                </label>
                {renderInput(
                  newAdminPassword,
                  (e) => setNewAdminPassword(e.target.value),
                  "New password",
                  "password"
                )}
              </div>
            </>
          ) : (
            renderButton(
              () => setShowChangePassword(true),
              "Change Admin Password"
            )
          )
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Create Admin Password
            </label>
            {renderInput(
              newAdminPassword,
              (e) => setNewAdminPassword(e.target.value),
              "New password",
              "password"
            )}
          </div>
        )}

        <div className="mt-auto">
          {renderButton(saveSettings, "Save Settings", false, true)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 min-h-48 bg-gradient-to-br from-black to-gray-900 text-white p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-lg font-bold">Warden</h1>
        </div>
        <button
          onClick={() => setView("settings")}
          className="text-sm text-gray-400 hover:text-white"
        >
          <Settings size={20} />
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Declare your task, lock in, and only get out when you've proven you're
        done.
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          What do you need to accomplish?
        </label>
        {renderTextarea(
          task,
          (e) => setTask(e.target.value),
          "e.g. Finish chapter 5 problem set"
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          Tasks
        </label>
        <div className="flex gap-2">
          {renderInput(
            newTask,
            (e) => setNewTask(e.target.value),
            "Add a task"
          )}
          {renderButton(handleAddTask, "Add", false, false, <Plus size={16} />)}
        </div>
        <ul className="text-sm text-gray-300 list-disc list-inside">
          {tasks.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          Allowed Tabs
        </label>
        <div className="max-h-32 overflow-y-auto bg-black bg-opacity-30 border border-red-500/50 rounded-lg p-2 text-sm">
          {tabs.map((tab) => (
            <div key={tab.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTabs.includes(tab.id)}
                onChange={() => handleTabSelection(tab.id)}
                className="form-checkbox bg-black bg-opacity-50 border-red-500/50 text-red-600 focus:ring-red-500"
              />
              <label>{tab.title}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wide">
          Session Mode
        </label>
        <div className="flex bg-black bg-opacity-30 border border-red-500/50 rounded-lg p-1">
          <button
            onClick={() => setMode("timer")}
            className={`flex-1 text-sm py-1 rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${
              mode === "timer"
                ? "bg-red-600 text-white"
                : "text-gray-400 hover:bg-red-500/20"
            }`}
          >
            <Timer size={16} />
            Timer
          </button>
          <button
            onClick={() => setMode("completion")}
            className={`flex-1 text-sm py-1 rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${
              mode === "completion"
                ? "bg-red-600 text-white"
                : "text-gray-400 hover:bg-red-500/20"
            }`}
          >
            <Check size={16} />
            Completion
          </button>
        </div>
      </div>

      {mode === "timer" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Session duration (minutes)
          </label>
          {renderInput(
            duration.toString(),
            (e) => setDuration(parseInt(e.target.value) || 0),
            "Minutes"
          )}
        </div>
      )}

      <div className="mt-auto">
        {renderButton(
          startSession,
          "Start Lockdown",
          !task.trim(),
          true,
          <Lock size={16} />
        )}
      </div>
    </div>
  );
}
