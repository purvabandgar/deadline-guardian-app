# Deadline Guardian AI

An AI-powered productivity companion that helps users plan, prioritize, and complete tasks before deadlines are missed — built for [Hackathon Name] under the "Last-Minute Life Saver" problem statement.

🔗 **Live App:** https://deadline-guardian-ai-1204e.web.app

## Problem

Existing productivity tools rely on passive reminders that are easy to ignore. Deadline Guardian AI moves beyond reminders — it actively plans, prioritizes, and *acts* on the user's behalf.

## Key Features

- **Smart Task Tracking** — automatic urgency classification (Critical / High / Medium / Low) with a live deadline risk meter and productivity score
- **AI Daily Planner** — Gemini generates a structured schedule for today based on current tasks: priority task, time-blocked plan, risk analysis, and motivation
- **AI Goal Breakdown (Agentic)** — the core agentic feature. A user enters a high-level goal and final deadline; Gemini decomposes it into 3–6 concrete subtasks with realistic intermediate deadlines. After a human review/confirm step, the app **autonomously writes those subtasks into Firestore** as real, tracked tasks — no manual entry required.
- **Ask Gemini AI** — free-form productivity coaching based on the user's current task list
- **Real-time sync** — all tasks update live across the UI via Firestore listeners
- **Firebase Authentication** — per-user task isolation

## How It's Agentic

Most AI productivity tools only *suggest*. Deadline Guardian AI's goal-breakdown flow plans **and** executes: Gemini's output is parsed, validated (deadlines are clamped to the user's actual time window), shown to the user for approval, then atomically batch-written into the user's live task data — making the AI a participant in the data model, not just a chat window beside it.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, lucide-react, canvas-confetti
- **Backend / Data:** Firebase Authentication, Cloud Firestore, Firebase Hosting
- **AI:** Google Gemini API (`gemini-2.5-flash`)

## Google Technologies Used

- Gemini API — daily planning, free-form coaching, autonomous goal breakdown
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env` file with:
