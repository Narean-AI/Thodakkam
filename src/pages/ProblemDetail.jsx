import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

export default function ProblemDetail(){
  const { id } = useParams()
  const [problem, setProblem] = useState(null)
  const [error, setError] = useState(null)

  useEffect(()=>{
    let mounted = true
    const load = async ()=>{
      try{
        const { data } = await api.get(`/problems/${encodeURIComponent(id)}`)
        if (!mounted) return
        setProblem(data)
      }catch(e){
        setError('Failed to load problem')
      }
    }
    load()
    return ()=> mounted = false
  },[id])

  if (error) return <div className="text-red-700">{error}</div>
  if (!problem) return <div className="text-slate-600">Loading...</div>

  return (
    <div className="app-container max-w-4xl">
      <div className="card p-6 md:p-8">
        <h2 className="page-title">{problem.title}</h2>
        <div className="text-sm text-slate-600 mt-2">{problem.company} • <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700">{problem.difficulty}</span></div>
        <div className="mt-3 text-sm text-slate-700">Credibility: <strong>{problem.credibility}%</strong></div>

        {problem.extras && (
          <div className="mt-4">
            <h3 className="font-semibold text-slate-900">Practice Prompt</h3>
            <p className="text-sm text-slate-700">{problem.extras.generatedPrompt}</p>

            <h3 className="mt-4 font-semibold text-slate-900">Resources & References</h3>
            <ul className="list-disc pl-5 text-sm text-slate-700">
              { (problem.extras.metaReferences || []).map((r,i)=> (
                <li key={i}><a href={r.url} target="_blank" rel="noreferrer" className="text-indigo-700 hover:text-indigo-800">{r.url}</a>{r.note ? ` — ${r.note}` : ''}</li>
              )) }
              { (problem.extras.resources || []).map((r,i)=> (
                <li key={`r${i}`}>{/^https?:\/\//.test(r) ? <a href={r} target="_blank" rel="noreferrer" className="text-indigo-700 hover:text-indigo-800">{r}</a> : <span>{r}</span>}</li>
              )) }
            </ul>

            <h3 className="mt-4 font-semibold text-slate-900">Mock Tests</h3>
            { (problem.extras.metaMockTests || []).map((m,mi)=> (
              <div key={mi} className="mb-2 rounded-lg border border-slate-200 p-3 bg-white">
                <div className="font-medium text-slate-900">{m.title}</div>
                <div className="text-sm text-slate-700">{m.content}</div>
              </div>
            )) }

            { (problem.extras.mockInterview || []).map((round,ri)=> (
              <div key={ri} className="mt-3 rounded-lg border border-slate-200 p-3 bg-white">
                <div className="font-semibold text-slate-900">{round.title} — ~{round.estimatedMinutes} mins</div>
                <ol className="list-decimal pl-6 text-sm text-slate-700 mt-1">
                  {round.questions.map((qj,qjIdx)=> (
                    <li key={qjIdx}>{qj.text} <span className="text-xs text-slate-500">(~{qj.suggestedMinutes}m)</span></li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
