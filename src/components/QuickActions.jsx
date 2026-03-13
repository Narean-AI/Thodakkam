
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { getTokenPayload } from '../utils/auth'

export default function QuickActions(){
  const navigate = useNavigate()
  const actions = [
    {label:'Start Mock Interview', to:'/search'},
    {label:'Upload Experience', to:'/upload'},
    {label:'Learn', to:'/learn'}
  ]
  const payload = getTokenPayload()
  const role = payload?.role || 'student'

  return (
    <div className="flex gap-2 items-start flex-wrap">
      <div className="flex gap-2 flex-wrap">
        {actions.map(a => (
          <button key={a.label} onClick={()=>navigate(a.to)} className="btn-primary px-3 py-2 text-sm">{a.label}</button>
        ))}
      </div>

      <div className="sm:ml-2 flex gap-2 flex-wrap">
        {role === 'student' && (
          <span className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-sm font-medium">Student View</span>
        )}
        {(role === 'admin' || role === 'super_admin') && (
          <>
            <a href="/panel/admin" className="btn-ghost px-3 py-2 text-sm">Admin View</a>
            <a href="/panel/admin?edit=1" className="btn-secondary px-3 py-2 text-sm">Admin Edit</a>
          </>
        )}
        {role === 'super_admin' && (
          <a href="/panel/super" className="btn-secondary px-3 py-2 text-sm">Super Admin</a>
        )}
      </div>
    </div>
  )
}
