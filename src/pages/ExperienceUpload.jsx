import React, { useState } from 'react'
import api from '../api'

export default function ExperienceUpload(){
  const [form,setForm] = useState({company:'', role:'', difficulty:50, description:'', reference_link:'', preparation_tips:'', resources:'', round:'', questions:'', tags:'', linkedin:'', github:''})
  const [status,setStatus] = useState(null)
  const [githubStatus, setGithubStatus] = useState({state: 'idle', msg: ''})

  const change = (k,v)=> setForm(s=>({...s,[k]:v}))

  const verify = async (url, type) => {
    if (!url) return {ok: false, msg: 'Empty'}
    setGithubStatus({state: 'checking', msg: 'Verifying...'})
    try{
      await api.post('/verify-profile', { url, type })
      setGithubStatus({state: 'ok', msg: 'Verified'})
      return {ok:true}
    }catch(err){
      const msg = err?.response?.data?.message || 'Could not verify'
      setGithubStatus({state: 'error', msg})
      return {ok:false, msg}
    }
  }

  const onGithubBlur = () => { if (form.github) verify(form.github, 'github') }

  const submit = async (e) => {
    e.preventDefault()
    // ensure at least one profile is provided; GitHub verification is required only if GitHub provided
    if (!form.linkedin && !form.github) { setStatus('Provide LinkedIn or GitHub profile'); return }
    if (form.github && githubStatus.state !== 'ok') { setStatus('Please verify GitHub profile'); return }

    try{
      await api.post('/experience', form)
      setStatus('Uploaded')
    }catch(err){
      setStatus(err?.response?.data?.message || 'Upload failed')
    }
  }

  const disableSubmit = (
    (!form.linkedin && !form.github) ||
    githubStatus.state === 'checking' ||
    githubStatus.state === 'error'
  )

  return (
    <div className="app-container max-w-5xl">
      <div className="card p-6 md:p-8">
        <h3 className="page-title">Upload Experience</h3>
        <p className="page-subtitle mt-1">Share your interview journey so others can prepare better.</p>
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-3 mt-5">
          <input value={form.company} onChange={e=>change('company',e.target.value)} placeholder="Company" className="field" />
          <input value={form.role} onChange={e=>change('role',e.target.value)} placeholder="Role" className="field" />
          <textarea value={form.description} onChange={e=>change('description',e.target.value)} placeholder="Description (what you learned, experience summary)" className="field md:col-span-2" rows={3} />
          <input value={form.reference_link} onChange={e=>change('reference_link',e.target.value)} placeholder="Reference Link (e.g. blog post, article)" className="field md:col-span-2" />
          <textarea value={form.preparation_tips} onChange={e=>change('preparation_tips',e.target.value)} placeholder="Preparation Tips (tips for interview rounds)" className="field md:col-span-2" rows={3} />
          <textarea value={form.resources} onChange={e=>change('resources',e.target.value)} placeholder="Resources (useful links, books, courses - one per line)" className="field md:col-span-2" rows={3} />
          <input value={form.round} onChange={e=>change('round',e.target.value)} placeholder="Round" className="field" />
          <input value={form.tags} onChange={e=>change('tags',e.target.value)} placeholder="Tags (comma separated)" className="field" />
          <textarea value={form.questions} onChange={e=>change('questions',e.target.value)} placeholder="Questions (one per line)" className="field md:col-span-2" rows={6} />
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-700 font-medium mb-1">Difficulty: {form.difficulty}</label>
            <input type="range" min={0} max={100} value={form.difficulty} onChange={e=>change('difficulty',e.target.value)} className="w-full" />
          </div>
          <div className="md:col-span-2">
            <input value={form.linkedin} onChange={e=>change('linkedin',e.target.value)} placeholder="LinkedIn profile URL (optional)" className="field" />
            <div className="text-xs mt-1 text-slate-500">LinkedIn verification is optional for now.</div>
          </div>
          <div className="md:col-span-2">
            <input value={form.github} onChange={e=>change('github',e.target.value)} onBlur={onGithubBlur} placeholder="GitHub profile URL" className="field" />
            <div className="text-xs mt-1">
              {githubStatus.state === 'checking' && <span className="text-amber-700">{githubStatus.msg}</span>}
              {githubStatus.state === 'ok' && <span className="text-emerald-700">{githubStatus.msg}</span>}
              {githubStatus.state === 'error' && <span className="text-red-700">{githubStatus.msg}</span>}
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button disabled={disableSubmit} className={`px-5 py-2.5 rounded text-white font-medium transition ${disableSubmit ? 'bg-slate-400 cursor-not-allowed' : 'btn-primary'}`}>Submit</button>
            {status && <div className="text-sm text-slate-700">{status}</div>}
          </div>
        </form>
      </div>
    </div>
  )
}
