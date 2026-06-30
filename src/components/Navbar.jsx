import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../services/firebase'

function Navbar() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/')
  }

  return (
    <nav className="bg-[#0a0e17]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center">
        <Link
          to="/"
          className="text-xl font-extrabold bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent"
        >
          Deadline Guardian AI
        </Link>
        <span className="hidden md:flex items-center gap-1 text-xs text-violet-400 bg-violet-400/10 px-2 py-1 rounded-full ml-3">
          ✨ Powered by Gemini AI
        </span>
      </div>
      <div className="flex gap-6 items-center">
        <Link to="/" className="text-slate-300 hover:text-cyan-400 transition">
          Home
        </Link>
        {user && (
          <Link to="/dashboard" className="text-slate-300 hover:text-cyan-400 transition">
            Dashboard
          </Link>
        )}

        {user ? (
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-400 transition"
          >
            Logout
          </button>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold hover:opacity-90 transition"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}

export default Navbar