const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

async function callGemini(prompt) {
  const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
}

export async function getAISuggestion(tasks) {
  const taskList = tasks
    .map(
      (t, index) =>
        `${index + 1}. ${t.title} | Deadline: ${new Date(
          t.deadline
        ).toLocaleString()}`
    )
    .join("\n")

  const prompt = `
You are Deadline Guardian AI, an intelligent productivity coach.

The user has these tasks:

${taskList}

Analyze all tasks and give your answer in EXACTLY this format.

📌 PRIORITY TASK
(Which task should be done first and why?)

⏰ TODAY'S SCHEDULE
Give a realistic study/work schedule.

⚠️ RISK ANALYSIS
Which deadline is most dangerous?

💡 PRODUCTIVITY TIPS
Give 3 short actionable tips.

🔥 MOTIVATION
End with one motivational sentence.

Keep the response short, practical and professional.
`

  try {
    return await callGemini(prompt)
  } catch (err) {
    console.error(err)
    return "Failed to contact Gemini."
  }
}

/**
 * Returns a structured daily plan as JSON:
 * {
 *   priorityTask: string,
 *   schedule: [{ time: string, task: string }],
 *   risk: string,
 *   motivation: string
 * }
 * Falls back to a safe default shape if Gemini doesn't return valid JSON,
 * so the UI never crashes on a parse failure.
 */
export async function getAIPlan(tasks) {
  const taskList = tasks
    .map(
      (t, index) =>
        `${index + 1}. ${t.title} | Deadline: ${new Date(
          t.deadline
        ).toLocaleString()}`
    )
    .join("\n")

  const prompt = `
You are Deadline Guardian AI, a productivity planning assistant.

The user has these tasks:

${taskList}

Current time: ${new Date().toLocaleString()}

Create a realistic plan for today based on these deadlines.

Return ONLY valid JSON. No markdown, no backticks, no extra text before or after.
Use EXACTLY this shape:

{
  "priorityTask": "string - which task to do first and a short reason",
  "schedule": [
    { "time": "09:00–10:30", "task": "string" }
  ],
  "risk": "string - one sentence on the most dangerous deadline and what happens if delayed",
  "motivation": "string - one short motivational sentence"
}

Include 3 to 5 schedule blocks. Keep every string short (under 20 words).
`

  const fallback = {
    priorityTask: "Could not generate a plan right now.",
    schedule: [],
    risk: "",
    motivation: "Try again in a moment.",
  }

  try {
    const raw = await callGemini(prompt)
    const cleaned = raw.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)

    return {
      priorityTask: parsed.priorityTask ?? fallback.priorityTask,
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      risk: parsed.risk ?? "",
      motivation: parsed.motivation ?? "",
    }
  } catch (err) {
    console.error("getAIPlan failed:", err)
    return fallback
  }
}

/**
 * Breaks a high-level goal into concrete subtasks with deadlines.
 * Returns an array: [{ title: string, deadline: string (ISO) }]
 * The deadline is calculated relative to `now` and the user's final goal deadline.
 */
export async function getGoalBreakdown(goalText, goalDeadline) {
  const now = new Date()

  const prompt = `
You are Deadline Guardian AI, an autonomous task-planning agent.

The user has a goal: "${goalText}"
This goal must be fully completed by: ${new Date(goalDeadline).toLocaleString()}
Current time: ${now.toLocaleString()}

Break this goal into 3 to 6 concrete, actionable subtasks that lead to completing it on time.
Distribute realistic deadlines for each subtask between now and the final deadline,
so the user has a clear day-by-day path instead of doing everything at the last minute.

Return ONLY valid JSON, no markdown, no backticks, no extra text. Use EXACTLY this shape:

{
  "subtasks": [
    { "title": "string - short actionable subtask", "deadline": "ISO 8601 datetime string" }
  ]
}

Every deadline must be a real ISO datetime between now (${now.toISOString()}) and the final deadline (${new Date(goalDeadline).toISOString()}).
`

  try {
    const raw = await callGemini(prompt)
    const cleaned = raw.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed.subtasks) ? parsed.subtasks : []
  } catch (err) {
    console.error("getGoalBreakdown failed:", err)
    return []
  }
}