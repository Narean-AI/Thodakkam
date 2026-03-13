import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Login(){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [error,setError] = useState(null)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    try{
      const { data } = await api.post('/auth/login', { email, password })
      // Expect { token }
      localStorage.setItem('token', data.token)
      navigate('/dashboard')
    }catch(err){
      setError(err?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="app-container min-h-full flex items-center">
      <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
        <section className="card p-8 flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">Welcome Back</p>
            <h1 className="page-title mt-2">Your interview prep cockpit</h1>
            <p className="page-subtitle mt-3">
              Resume your preparation, track test readiness, and access company-specific problem patterns in one place.
            </p>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-white p-3">Live readiness tracking and weak-topic insights</div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">Smart trend analytics from your actual attempts</div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">Role-based dashboards for students and admins</div>
          </div>
        </section>

        <section className="card p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
          <p className="text-sm text-slate-600 mb-5">Enter your credentials to continue.</p>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="field" />
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="field" />
            <button className="btn-primary px-4 py-2.5">Login</button>
          </form>
          <div className="text-sm mt-4 text-slate-600">
            No account? <Link to="/register" className="text-indigo-700 font-semibold hover:text-indigo-800">Create one</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
