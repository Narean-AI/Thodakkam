import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Register(){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [name,setName] = useState('')
  const [role, setRole] = useState('student')
  const [error,setError] = useState(null)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try{
      // if current user is super_admin and selected role isn't 'student', use admin endpoints
      const token = localStorage.getItem('token')
      let currentRole = null
      try{ currentRole = token ? JSON.parse(atob(token.split('.')[1])).role : null }catch(e){}

      if (currentRole === 'super_admin' && role !== 'student'){
        // create admin then optionally promote
        const res = await api.post('/admin/admins', { name, email, password })
        if (role === 'super_admin'){
          const created = res.data.user
          if (created && created.id) await api.post(`/admin/promote/${created.id}`)
        }
        navigate('/dashboard')
        return
      }

      await api.post('/auth/register', { name, email, password })
      navigate('/login')
    }catch(err){
      const data = err?.response?.data
      const validationError = Array.isArray(data?.errors) ? data.errors[0]?.msg : null
      setError(validationError || data?.message || 'Register failed')
    }
  }

  return (
    <div className="app-container min-h-full flex items-center">
      <div className="w-full max-w-4xl mx-auto card p-8">
        <h2 className="page-title mb-2">Create your account</h2>
        <p className="page-subtitle mb-6">Set up your profile to start personalized preparation and analytics.</p>
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="field" required />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" className="field" required />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" minLength={6} className="field" required />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
            <select value={role} onChange={e=>setRole(e.target.value)} className="field text-sm">
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="md:col-span-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
            Registrations create student accounts by default. Only an authenticated Super Admin can create admin and super admin accounts.
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3 flex-wrap">
            <button className="btn-primary px-5 py-2.5">Create account</button>
            <button type="button" onClick={() => navigate('/login')} className="btn-ghost px-4 py-2">Back to login</button>
          </div>
        </form>
      </div>
    </div>
  )
}
