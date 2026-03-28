# 🔒 Warden
> *An AI-powered extension of the traditional lockdown browser — built to keep you focused and honest.*

---

## Overview

Warden is a browser extension that combines the strictness of a lockdown browser with the flexibility of an AI judge. You declare what you need to do, lock yourself in, and only get out when you can prove you've actually done it.

---

## Core Features

### 🔐 Tab Locking

At the start of a session, you:
1. Declare the work you need to complete
2. Specify which tabs/websites you need access to, with a reason for each

Warden then **blocks all other websites and tabs** until you can prove your work is done.

**Proof of completion requirements:**
- Must show sufficient evidence (e.g., quiz accuracy, submitted assignment, completed task)
- Warden checks against the original assignment prompt to verify you actually did the work
- Invalid or fabricated excuses are evaluated by an algorithm that assesses realism and plausibility
- Warden enforces completion — it won't let you off easy

---

### 🚨 Emergency Tab Unblocking

If you genuinely need access to a blocked site mid-session:

- Submit a reason/excuse for why you need the tab
- A **lenient AI judge** evaluates whether the request is valid
- If approved, access is granted to that specific tab for a **limited, specified time period**
- **Optional:** Require approval from a designated second person (e.g., a parent, teacher, or accountability partner) before access is granted

---

## Additional Features

| Feature | Description |
|---|---|
| **Whitelist** | A list of pages that are always allowed, regardless of lock state |
| **Administrator Password** | An override password to end a lockdown session immediately |
| **Break Sessions** | Optional scheduled breaks (default: 5 min every 1 hr, configurable at session start) |
| **User Authentication** | Signup/login to save preferences and session history |

---

## Pages & UI

### Extension Home Page

**When logged out:**
- Sign up / Log in prompt

**When logged in (no active session):**
- Start a new lockdown session
  - Set tasks / goals
  - Set blocked websites/tabs
  - Configure break schedule
  - Set whitelist
- View session history

**During an active lockdown session:**
- Current task list with completion status
- Timer / break countdown
- Emergency tab request button
- Proof-of-completion submission

---

## How It Works — User Flow

```
Start Session
    ↓
Declare tasks + allowed tabs (with reasons)
    ↓
Lockdown begins — all other tabs blocked
    ↓
  [Need a break?] → Break session (if enabled, every 1 hr for 5 min)
  [Emergency tab?] → Submit excuse → AI judges → Timed access granted or denied
    ↓
Submit proof of completion
    ↓
AI verifies proof against original task
    ↓
Lockdown ends ✓
```

---

## Configuration Options

- **Break interval** — how often breaks occur (default: every 60 min)
- **Break duration** — how long each break lasts (default: 5 min)
- **Emergency approver** — optional second person who must approve emergency tab requests
- **Administrator password** — override to end session manually
- **Whitelist** — sites always available regardless of lock state

---

## Planned / Future Features

- [ ] Make it able to see your screen
- [ ] Integration with LMS platforms (Canvas, Google Classroom)