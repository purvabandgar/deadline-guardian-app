import { useEffect, useState } from 'react'
import { auth, db } from '../services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { Plus, Trash2, Clock, AlertTriangle, CheckCircle2, ListTodo, Bot, Loader2, Sparkles, CalendarClock, Target } from 'lucide-react'
import { getAISuggestion, getAIPlan, getGoalBreakdown } from '../services/gemini'
import confetti from 'canvas-confetti'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [displayedText, setDisplayedText] = useState('')

  // AI Daily Planner state
  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)

  // AI Goal Breakdown state
  const [goalText, setGoalText] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [goalLoading, setGoalLoading] = useState(false)
  const [proposedSubtasks, setProposedSubtasks] = useState(null) // null = no proposal yet
  const [goalError, setGoalError] = useState('')

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, 'tasks'), where('uid', '==', currentUser.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      setTasks(list)
    })
    return () => unsubscribe()
  }, [currentUser])

  const addTask = async (e) => {
    e.preventDefault()
    if (!title || !deadline || !currentUser) return
    await addDoc(collection(db, 'tasks'), {
      uid: currentUser.uid,
      title: title,
      deadline: deadline,
      createdAt: serverTimestamp(),
    })
    setTitle('')
    setDeadline('')
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22d3ee', '#34d399', '#a78bfa'],
    })
  }

  const removeTask = async (id) => {
    await deleteDoc(doc(db, 'tasks', id))
  }

  // ---- Urgency / Smart Priority / Risk % ----
  // hours < 0  -> Critical (overdue)
  // hours < 24 -> High
  // hours < 72 -> Medium
  // else       -> Low
  const getUrgency = (deadlineStr) => {
    const deadlineDate = new Date(deadlineStr)
    const now = new Date()
    const diffMs = deadlineDate.getTime() - now.getTime()
    const hours = diffMs / (1000 * 60 * 60)

    if (hours < 0) {
      return {
        key: 'critical',
        label: '🔥 Critical',
        color: 'text-red-400 border-red-400/40',
        bg: 'bg-red-400/10',
        barColor: 'bg-red-400',
        riskPercent: 100,
      }
    }
    if (hours < 24) {
      return {
        key: 'high',
        label: '⚠️ High',
        color: 'text-orange-400 border-orange-400/40',
        bg: 'bg-orange-400/10',
        barColor: 'bg-orange-400',
        riskPercent: Math.round(60 + (1 - hours / 24) * 35),
      }
    }
    if (hours < 72) {
      return {
        key: 'medium',
        label: '📌 Medium',
        color: 'text-yellow-400 border-yellow-400/40',
        bg: 'bg-yellow-400/10',
        barColor: 'bg-yellow-400',
        riskPercent: Math.round(30 + (1 - hours / 72) * 30),
      }
    }
    return {
      key: 'low',
      label: '✅ Low',
      color: 'text-emerald-400 border-emerald-400/40',
      bg: 'bg-emerald-400/10',
      barColor: 'bg-emerald-400',
      riskPercent: Math.max(5, Math.round(20 - hours / 24)),
    }
  }

  const overdueCount = tasks.filter((t) => getUrgency(t.deadline).key === 'critical').length
  const urgentCount = tasks.filter((t) => getUrgency(t.deadline).key === 'high').length
  const onTrackCount = tasks.filter((t) => getUrgency(t.deadline).key === 'low').length

  // ---- Productivity Score ----
  const productivityScore =
    tasks.length === 0 ? 100 : Math.round(((tasks.length - overdueCount) / tasks.length) * 100)

  const scoreLabel =
    productivityScore >= 90 ? 'Excellent' :
    productivityScore >= 70 ? 'Good' :
    productivityScore >= 40 ? 'Needs Focus' : 'At Risk'

  const scoreColor =
    productivityScore >= 90 ? 'text-emerald-400' :
    productivityScore >= 70 ? 'text-cyan-400' :
    productivityScore >= 40 ? 'text-orange-400' : 'text-red-400'

  const handleAskAI = async () => {
    if (tasks.length === 0) return
    setAiLoading(true)
    setAiSuggestion('')
    setDisplayedText('')
    try {
      const result = await getAISuggestion(tasks)
      setAiSuggestion(result)
      let i = 0
      const interval = setInterval(() => {
        setDisplayedText(result.slice(0, i))
        i++
        if (i > result.length) clearInterval(interval)
      }, 15)
    } catch (err) {
      setAiSuggestion('Could not get AI suggestion right now.')
      setDisplayedText('Could not get AI suggestion right now.')
    }
    setAiLoading(false)
  }

  const handleGeneratePlan = async () => {
    if (tasks.length === 0) return
    setPlanLoading(true)
    setPlan(null)
    const result = await getAIPlan(tasks)
    setPlan(result)
    setPlanLoading(false)
  }

  const handleBreakdownGoal = async (e) => {
    e.preventDefault()
    if (!goalText || !goalDeadline || !currentUser) return
    setGoalLoading(true)
    setProposedSubtasks(null)
    setGoalError('')
    try {
      const subtasks = await getGoalBreakdown(goalText, goalDeadline)
      if (subtasks.length === 0) {
        setGoalError('Gemini could not break this goal down. Try rephrasing it or widening the deadline.')
      } else {
        setProposedSubtasks(subtasks)
      }
    } catch (err) {
      setGoalError('Something went wrong generating the breakdown.')
    }
    setGoalLoading(false)
  }

  const confirmCreateSubtasks = async () => {
    if (!proposedSubtasks || !currentUser) return
    const batch = writeBatch(db)
    proposedSubtasks.forEach((subtask) => {
      const ref = doc(collection(db, 'tasks'))
      batch.set(ref, {
        uid: currentUser.uid,
        title: subtask.title,
        deadline: subtask.deadline,
        createdAt: serverTimestamp(),
        sourceGoal: goalText,
      })
    })
    try {
      await batch.commit()
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#a78bfa', '#22d3ee', '#34d399'],
      })
      setProposedSubtasks(null)
      setGoalText('')
      setGoalDeadline('')
    } catch (err) {
      setGoalError('Failed to save subtasks to Firestore. Nothing was written — try again.')
    }
  }

  const discardProposal = () => {
    setProposedSubtasks(null)
    setGoalError('')
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center text-cyan-400">
        Loading your dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white px-6 py-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Hero Section */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400">
            <ListTodo size={22} className="text-gray-900" />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Deadline Guardian AI
          </h1>
        </div>
        <p className="text-slate-400 mb-1 ml-1">Your Personal AI Productivity Coach</p>
        <p className="text-xs text-slate-500 mb-8 ml-1 tracking-wide uppercase">
          Powered by Gemini AI + Firebase
        </p>

        {/* Productivity Score */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className={scoreColor}
                stroke="currentColor"
                strokeDasharray={`${(productivityScore / 100) * 263.9} 263.9`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${scoreColor}`}>{productivityScore}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-400">Today's Productivity</p>
            <p className={`text-2xl font-bold ${scoreColor}`}>{scoreLabel}</p>
            <p className="text-xs text-slate-500 mt-1">
              {tasks.length - overdueCount} of {tasks.length || 0} tasks on track
            </p>
          </div>
        </div>

        {/* AI Daily Planner */}
        <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-400/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-violet-400" />
              <h2 className="text-lg font-bold">Today's AI Plan</h2>
            </div>
            <button
              onClick={handleGeneratePlan}
              disabled={planLoading || tasks.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition"
            >
              {planLoading ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />}
              {planLoading ? 'Planning...' : plan ? 'Regenerate Plan' : 'Generate Plan'}
            </button>
          </div>

          {!plan && !planLoading && (
            <p className="text-slate-500 text-sm">
              {tasks.length === 0
                ? 'Add a task first, then generate a plan for your day.'
                : 'Click "Generate Plan" to get an AI-built schedule for today.'}
            </p>
          )}

          {plan && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-violet-400 font-semibold mb-1">Priority Task</p>
                <p className="text-slate-200 text-sm">{plan.priorityTask}</p>
              </div>

              {plan.schedule.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-violet-400 font-semibold mb-2">Schedule</p>
                  <div className="flex flex-col gap-2">
                    {plan.schedule.map((block, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-cyan-300 text-sm font-mono shrink-0">{block.time}</span>
                        <span className="text-slate-300 text-sm">{block.task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {plan.risk && (
                <div className="flex gap-2 items-start bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{plan.risk}</p>
                </div>
              )}

              {plan.motivation && (
                <p className="text-emerald-300 text-sm italic">🔥 {plan.motivation}</p>
              )}
            </div>
          )}
        </div>

        {/* AI Goal Breakdown — autonomous subtask creation */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-400/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target size={20} className="text-cyan-400" />
            <h2 className="text-lg font-bold">Goal → AI Breakdown</h2>
          </div>

          {!proposedSubtasks && (
            <form onSubmit={handleBreakdownGoal} className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. Finish my hackathon submission"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-cyan-400/50 transition"
                required
              />
              <input
                type="datetime-local"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-cyan-400/50 transition"
                required
              />
              <button
                type="submit"
                disabled={goalLoading}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold hover:opacity-90 disabled:opacity-40 transition"
              >
                {goalLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {goalLoading ? 'Breaking down...' : 'Break Down Goal'}
              </button>
            </form>
          )}

          {goalError && (
            <p className="text-red-400 text-sm mt-3">{goalError}</p>
          )}

          {proposedSubtasks && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-400 text-sm">
                Gemini proposed {proposedSubtasks.length} subtasks for "{goalText}". Review before adding to your task list:
              </p>
              <div className="flex flex-col gap-2">
                {proposedSubtasks.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-slate-200 text-sm">{s.title}</span>
                    <span className="text-cyan-300 text-xs font-mono shrink-0 ml-3">
                      {new Date(s.deadline).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmCreateSubtasks}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold hover:opacity-90 transition"
                >
                  <CheckCircle2 size={16} /> Create {proposedSubtasks.length} Tasks
                </button>
                <button
                  onClick={discardProposal}
                  className="px-5 py-2 rounded-full border border-white/10 text-slate-300 hover:bg-white/5 transition"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ask Gemini AI (free-form coach) */}
        <button
          onClick={handleAskAI}
          disabled={aiLoading || tasks.length === 0}
          className="mb-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold hover:opacity-90 disabled:opacity-40 transition"
        >
          {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
          {aiLoading ? 'Thinking...' : 'Ask Gemini AI'}
        </button>

        {aiSuggestion && (
          <div className="mb-8 bg-violet-500/10 border border-violet-400/30 rounded-2xl p-5 flex gap-3">
            <Bot size={22} className="text-violet-400 shrink-0 mt-1" />
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
              {displayedText}
              {displayedText.length < aiSuggestion.length && (
                <span className="animate-pulse">▋</span>
              )}
            </p>
          </div>
        )}

        <p className="text-slate-400 mb-8 ml-1">
          Stay on top of every task before time runs out
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-red-400/20 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-400/10">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{overdueCount}</p>
              <p className="text-xs text-slate-400">Overdue</p>
            </div>
          </div>
          <div className="bg-white/5 border border-orange-400/20 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-400/10">
              <Clock size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{urgentCount}</p>
              <p className="text-xs text-slate-400">Urgent (24h)</p>
            </div>
          </div>
          <div className="bg-white/5 border border-emerald-400/20 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-400/10">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{onTrackCount}</p>
              <p className="text-xs text-slate-400">On Track</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={addTask}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-4 mb-10"
        >
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-cyan-400/50 transition"
            required
          />
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-cyan-400/50 transition"
            required
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold hover:opacity-90 hover:scale-105 transition transform"
          >
            <Plus size={18} /> Add Task
          </button>
        </form>

        <div className="flex flex-col gap-4">
          {tasks.length === 0 && (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <ListTodo size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No tasks yet. Add your first deadline above.</p>
            </div>
          )}
          {tasks.map((task) => {
            const urgency = getUrgency(task.deadline)
            return (
              <div
                key={task.id}
                className={`flex flex-col gap-3 border rounded-xl p-4 hover:-translate-y-0.5 transition transform ${urgency.color} ${urgency.bg}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{task.title}</h3>
                    <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                      <Clock size={14} />
                      {new Date(task.deadline).toLocaleString()}
                    </p>
                    <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${urgency.color}`}>
                      {urgency.label}
                    </span>
                  </div>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition p-2 rounded-lg shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Risk Meter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Deadline Risk</span>
                    <span className={`text-xs font-semibold ${urgency.color.split(' ')[0]}`}>
                      {urgency.riskPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${urgency.barColor} transition-all`}
                      style={{ width: `${urgency.riskPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard