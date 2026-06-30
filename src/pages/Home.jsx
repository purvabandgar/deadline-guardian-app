import { Link } from 'react-router-dom'
import { Clock, Brain, Sparkles, ShieldCheck, ArrowRight, Zap } from 'lucide-react'

function Home() {
  const features = [
    {
      title: 'Smart Deadline Tracking',
      desc: 'Automatically organizes and prioritizes your tasks based on urgency.',
      icon: Clock,
      color: 'from-cyan-400 to-blue-400',
    },
    {
      title: 'AI-Powered Suggestions',
      desc: 'Get intelligent recommendations powered by Gemini AI to stay on track.',
      icon: Brain,
      color: 'from-violet-400 to-purple-400',
    },
    {
      title: 'Memory That Learns',
      desc: 'Cognee remembers your patterns to give smarter reminders over time.',
      icon: Sparkles,
      color: 'from-emerald-400 to-teal-400',
    },
  ]

  const stats = [
    { label: 'Deadlines Tracked', value: '10K+', icon: ShieldCheck },
    { label: 'AI Suggestions Given', value: '5K+', icon: Zap },
    { label: 'Hours Saved', value: '2K+', icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-3xl"></div>
      <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col items-center pt-24 px-6 text-center">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
          <Sparkles size={16} className="text-cyan-400" />
          <span className="text-sm text-slate-300">Built for Google AI Hackathon</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent leading-tight">
          Deadline Guardian AI
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-xl">
          Your AI Productivity Companion — never miss a deadline again 🚀
        </p>

        <Link
          to="/login"
          className="mt-8 flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold hover:opacity-90 hover:scale-105 transition transform"
        >
          Get Started <ArrowRight size={18} />
        </Link>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap justify-center gap-8">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Icon size={20} className="text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl pb-24">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-cyan-400/50 hover:-translate-y-1 transition transform"
              >
                <div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${f.color} mb-4 group-hover:scale-110 transition`}
                >
                  <Icon size={24} className="text-gray-900" />
                </div>
                <h3 className="text-xl font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-slate-400 text-sm">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Home