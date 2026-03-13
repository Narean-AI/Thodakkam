import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import getTokenPayload from '../utils/auth'

export default function Navbar(){
  const navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }
  let role = null
  try{
    // use ES import helper
    const payload = getTokenPayload()
    console.debug('Navbar: parsed token payload role =', payload && payload.role ? payload.role : null)
    if (payload && payload.role) role = payload.role
  }catch(e){ role = null }
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
        : 'text-slate-700 hover:text-slate-900 hover:bg-white/70 border border-transparent'
    }`

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="app-container px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="group text-xl sm:text-2xl font-black tracking-tight leading-none transition-transform duration-200 hover:-translate-y-0.5">
            <span className="bg-gradient-to-r from-indigo-700 to-sky-600 bg-clip-text text-transparent transition-all duration-200 group-hover:from-indigo-800 group-hover:to-sky-500">Thodakkam</span>
          </Link>
          <nav className="flex items-center gap-1 flex-wrap">
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/search" className={linkClass}>Search</NavLink>
            <NavLink to="/learn" className={linkClass}>Learn</NavLink>
            <NavLink to="/experiences" className={linkClass}>Experiences</NavLink>
            <NavLink to="/scoreboard" className={linkClass}>Scoreboard</NavLink>
            {role === 'student' && <NavLink to="/panel/roadmap" className={linkClass}>Roadmap</NavLink>}
            {(role === 'admin' || role === 'super_admin') && <NavLink to="/panel/admin" className={linkClass}>Admin</NavLink>}
            {role === 'super_admin' && <NavLink to="/panel/super" className={linkClass}>Super Admin</NavLink>}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {role ? role.replace('_', ' ').toUpperCase() : 'GUEST'}
          </span>
          <Link to="/upload" className="btn-primary px-4 py-2 text-sm">Upload</Link>
          <button onClick={handleLogout} className="btn-ghost px-4 py-2 text-sm">Logout</button>
        </div>
      </div>
    </header>
  )
}
