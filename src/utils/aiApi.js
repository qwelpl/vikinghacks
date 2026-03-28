async function call(system, userMsg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'CALL_AI', system, userMsg },
      (res) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (res?.error) {
          return reject(new Error(res.error));
        }
        resolve(res.text || '');
      }
    );
  });
}

function parseJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error('No JSON found in AI response');
}

export async function suggestTasks(goal) {
  const system = `You are a helpful assistant for a productivity tool called Warden.
Your job is to break down a user's declared goal into a list of smaller, actionable tasks.
Each task should be a clear, concise step toward completing the main goal.
Provide a list of 2-5 tasks.

You MUST respond with ONLY valid JSON, no prose, no markdown fences:
{"tasks":["First task","Second task","Third task"]}`;

  const msg = `DECLARED GOAL:\n${goal}`;

  try {
    const text = await call(system, msg);
    const json = parseJSON(text);
    return json.tasks || [];
  } catch (_e) {
    return [];
  }
}

export async function suggestWebsites(goal) {
  const system = `You are a helpful assistant for a productivity tool called Warden.
Your job is to suggest a list of relevant websites for the user's declared goal.
Provide a mix of general-purpose sites (like Wikipedia) and specific, niche sites if applicable.
Only suggest websites that are likely to be useful for the user's goal.

You MUST respond with ONLY valid JSON, no prose, no markdown fences:
{"sites":["example.com","anotherexample.com"]}`;

  const msg = `DECLARED GOAL:\n${goal}`;

  try {
    const text = await call(system, msg);
    const json = parseJSON(text);
    return json.sites || [];
  } catch (_e) {
    return [];
  }
}

export async function judgeProofOfCompletion(goal, proof, pageActivity = []) {
  let evidenceBlock;
  if (pageActivity.length > 0) {
    const pages = pageActivity.slice(0, 10).map((p) => {
      const lines = [`• "${p.title}"\n  URL: ${p.url}  (visited ${p.visits}×)`];
      if (p.content) lines.push(`  Content sample: ${p.content.slice(0, 600)}`);
      return lines.join('\n');
    });
    evidenceBlock = `AUTOMATICALLY CAPTURED BROWSING EVIDENCE (${pageActivity.length} page(s) visited on allowed sites):\n\n${pages.join('\n\n')}`;
  } else {
    evidenceBlock = 'BROWSING EVIDENCE: No pages were captured during this session (user may not have visited any allowed sites).';
  }

  const system = `You are a strict but fair evaluator for a productivity lockdown tool called Warden.
Your job is to determine if the user genuinely completed their declared goal.

You have TWO sources of evidence:
1. Automatically captured browsing data, the actual pages the user visited (titles + content excerpts)
2. The user's own written explanation of what they did

Evaluation rules:
- Weight the browsing evidence heavily, it is objective and cannot be faked
- If browsing evidence strongly aligns with the goal, lean toward approving even with thin written proof
- If browsing evidence does NOT match the goal (wrong sites, irrelevant content), reject even with a good written story
- If there is no browsing evidence at all, require a more detailed written proof
- Reject vague written answers ("done", "finished it") when unsupported by evidence
- Be firm but fair, a plausible match is enough

You MUST respond with ONLY valid JSON, no prose, no markdown fences:
{"approved":true,"confidence":85,"feedback":"short explanation referencing specific evidence","missing":"what's needed if rejected"}`;

  const msg = `DECLARED GOAL:\n${goal}\n\n${evidenceBlock}\n\nUSER'S WRITTEN EXPLANATION:\n${proof || '(none provided)'}`;

  try {
    const text = await call(system, msg);
    return parseJSON(text);
  } catch (_e) {
    return {
      approved: false,
      confidence: 0,
      feedback: 'Could not parse AI response. Please try again.',
      missing: '',
    };
  }
}

export async function judgeEmergencyRequest(reason, goal, requestedUrl) {
  const system = `You are a lenient judge for a productivity tool called Warden.
A user locked in a work session needs temporary access to a blocked website.
Be reasonable, approve genuine needs, deny obvious avoidance.

You MUST respond with ONLY valid JSON, no prose, no markdown fences:
{"approved":true,"duration":10,"reasoning":"short explanation","warning":"optional note if approved"}

duration must be 5, 10, 15, or 30 (minutes). Only include if approved.`;

  const msg = `Session goal:\n${goal}\n\nRequested URL: ${requestedUrl}\n\nUser's reason:\n${reason}`;

  
  await chrome.runtime.sendMessage({
    type: 'LOG_BYPASS_ATTEMPT',
    request: { url: requestedUrl, reason, time: Date.now() },
  });

  try {
    const text = await call(system, msg);
    return parseJSON(text);
  } catch (_e) {
    return {
      approved: false,
      reasoning: 'Could not parse AI response. Please try again.',
    };
  }
}
