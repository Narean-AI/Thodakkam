import React, { useEffect, useState } from 'react'
import api from '../../api'

export default function SuperAdminPanel(){
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [message, setMessage] = useState(null)

  const fetchUsers = async (opts = {}) => {
    setLoading(true)
    try {
      const params = { q: opts.q ?? q, page: opts.page ?? page, limit: opts.limit ?? limit }
      const res = await api.get('/admin/users', { params })
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
      setPage(res.data.page || params.page)
      setLimit(res.data.limit || params.limit)
    } catch (e) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Failed to load users' })
    } finally { setLoading(false) }
  }

  useEffect(()=>{ fetchUsers() }, [page, limit])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSearchChange = e => setQ(e.target.value)
  const doSearch = () => { setPage(1); fetchUsers({ q, page: 1, limit }) }
  const resetSearch = () => { setQ(''); setPage(1); fetchUsers({ q: '', page: 1, limit }) }

  const createAdmin = async (e) => {
    e.preventDefault()
    setCreating(true)
    setMessage(null)
    try {
      await api.post('/admin/admins', { name: form.name, email: form.email, password: form.password })
      setMessage({ type: 'success', text: 'Admin created' })
      setForm({ name: '', email: '', password: '' })
      fetchUsers()
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Create failed' })
    } finally { setCreating(false) }
  }

  const promote = async (userId) => {
    setMessage(null)
    try {
      await api.post(`/admin/promote/${userId}`)
      setMessage({ type: 'success', text: 'User promoted to super_admin' })
      fetchUsers()
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Promote failed' })
    }
  }

  const promoteToAdmin = async (userId) => {
    setMessage(null)
    try {
      await api.post(`/admin/promote-admin/${userId}`)
      setMessage({ type: 'success', text: 'User promoted to admin' })
      fetchUsers()
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Promote failed' })
    }
  }

  return (
    <div>
      <h2 className="page-title mb-6">Super Admin Panel</h2>

      {message && (
        <div className={`p-3 mb-4 rounded-lg border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {message.text}
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="font-semibold text-slate-900 mb-4 text-lg">Create Admin</div>
        <form onSubmit={createAdmin} className="space-y-3">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="field" />
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="field" />
          <input name="password" value={form.password} onChange={handleChange} placeholder="Password" type="password" className="field" />
          <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Admin'}</button>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-slate-900">Users</div>
          <div className="flex items-center gap-2">
            <input value={q} onChange={handleSearchChange} placeholder="Search name or email" className="field py-2 text-sm" />
            <button onClick={doSearch} className="btn-primary py-2 text-sm">Search</button>
            <button onClick={resetSearch} className="btn-ghost py-2 text-sm">Reset</button>
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value,10)); setPage(1); }} className="field py-2 text-sm">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>
        </div>

        {loading ? <div className="text-slate-500">Loading users...</div> : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:shadow-sm transition">
                <div>
                  <div className="font-medium text-slate-900">{u.name} <span className="text-sm text-slate-500">({u.email})</span></div>
                  <div className="text-sm text-slate-500 mt-0.5 capitalize">Role: {u.role}</div>
                </div>
                <div className="flex gap-2">
                  {u.role !== 'admin' && u.role !== 'super_admin' && (
                    <button onClick={()=>promoteToAdmin(u.id)} className="btn-secondary text-sm py-1.5">Make Admin</button>
                  )}
                  {u.role !== 'super_admin' && (
                    <button onClick={()=>promote(u.id)} className="btn-primary text-sm py-1.5">Promote</button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-500">Showing {(users.length>0)? ((page-1)*limit+1) : 0} - {Math.min(page*limit, total)} of {total}</div>
              <div className="flex gap-2">
                <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="btn-ghost py-2 text-sm disabled:opacity-40">Prev</button>
                <button disabled={page*limit >= total} onClick={()=>setPage(p=>p+1)} className="btn-ghost py-2 text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
