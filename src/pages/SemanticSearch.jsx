import React, { useEffect, useState } from 'react'
import api from '../api'
import MockTestRunner from '../components/MockTestRunner'
import SearchResultCard from '../components/SearchResultCard'

export default function SemanticSearch(){
  const [q,setQ] = useState('')
  const [company,setCompany] = useState('')
  const [role,setRole] = useState('')
  const [difficulty,setDifficulty] = useState('')
  const [companies,setCompanies] = useState([])
  const [roles,setRoles] = useState([])
  const [results,setResults] = useState([])
  const [error,setError] = useState(null)
  const [extras,setExtras] = useState(null)
  const [showPerResultExtras, setShowPerResultExtras] = useState(false)
  const [prepAssets, setPrepAssets] = useState(null)
  const [searched, setSearched] = useState(false)
  
  const [selectedMockTest, setSelectedMockTest] = useState(null)

  const toScoredMockTest = (test, fallbackCompany, fallbackRole) => {
    const rawQuestions = Array.isArray(test?.questions) ? test.questions : []
    const mcqQuestions = rawQuestions
      .map((question) => {
        if (!question || typeof question !== 'object') return null
        if (!Array.isArray(question.options)) return null
        if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length) {
          return null
        }

        return {
          text: question.text || 'Question',
          options: question.options,
          answerIndex: question.answerIndex
        }
      })
      .filter(Boolean)

    if (!mcqQuestions.length) {
      return null
    }

    return {
      title: test?.title || `${fallbackCompany || 'Company'} ${fallbackRole || 'Interview'} Mock Test`,
      questions: mcqQuestions,
      company: fallbackCompany || company || null,
      role: fallbackRole || role || null
    }
  }

  const getScoredMockFromPrepAssets = (targetCompany, targetRole) => {
    const tests = prepAssets?.mock_tests || []
    for (const test of tests) {
      const normalized = toScoredMockTest(test, targetCompany, targetRole)
      if (normalized) return normalized
    }
    return null
  }

  const fetchPrepAssetsForSelection = async (targetCompany, targetRole) => {
    if (!targetCompany) return null
    try {
      const query = new URLSearchParams({
        company: targetCompany,
        role: targetRole || ''
      }).toString()
      const { data } = await api.get(`/prep?${query}`)
      const prepared = data && !data.error ? data : null
      setPrepAssets(prepared)
      return prepared
    } catch (error) {
      setPrepAssets(null)
      return null
    }
  }

  useEffect(()=>{
    let mounted = true
    const loadMeta = async ()=>{
      try{
        const [cRes, dRes] = await Promise.all([
          api.get('/meta/companies'),
          api.get('/meta/difficulties')
        ])
        if (!mounted) return
        setCompanies(cRes.data.companies || [])
        setRoles([])
        setDifficulty('')
        setCompany('')
        // difficulties: dRes.data.difficulties -> use level names
        const diffs = (dRes.data.difficulties || []).map(d=>d.level)
        // If current difficulty is empty, keep as is; else ensure it remains valid
        // Store difficulties locally for select options
        setAvailableDifficulties(diffs)
      }catch(e){
        console.error('meta load failed', e)
      }
    }
    loadMeta()
    return ()=>{ mounted = false }
  },[])

  const [availableDifficulties, setAvailableDifficulties] = useState(['Easy','Medium','Hard'])

  const onCompanyChange = async (e) => {
    const companyName = e.target.value
    setCompany(companyName)
    setRole('')
    setRoles([])
    if (!companyName) return
    try{
      // find company id
      const c = companies.find(x=>x.name === companyName)
      const params = {}
      if (c) params.company_id = c.id
      else params.company = companyName
      const query = new URLSearchParams(params).toString()
      const { data } = await api.get(`/meta/roles?${query}`)
      setRoles(data.roles || [])
      // fetch prep assets immediately for this company (no role yet)
      await fetchPrepAssetsForSelection(companyName, '')
    }catch(err){
      console.error('roles fetch failed', err)
    }
  }

  const onRoleChange = async (e) => {
    const roleName = e.target.value
    setRole(roleName)
    // fetch prep assets for selected company+role
    if (!company) { setPrepAssets(null); return }
    await fetchPrepAssetsForSelection(company, roleName)
  }

  const search = async (e) => {
    e && e.preventDefault()
    setSearched(true)
    try{
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (company) params.set('company', company)
      if (role) params.set('role', role)
      if (difficulty) params.set('difficulty', difficulty)
      const { data } = await api.get(`/search?${params.toString()}`)
      setResults(data.results || data)
      setExtras(data.extras || null)
      // auto-load scored preparation assets for the selected company+role
      if (company) {
        await fetchPrepAssetsForSelection(company, role)
      } else {
        setPrepAssets(null)
      }
    }catch(err){
      setError('Search failed')
    }
  }

  const runManualTest = () => {
    // prefer prepAssets.mock_tests -> extras.mockInterview -> first result mockInterview
    try{
      if (prepAssets && prepAssets.mock_tests && prepAssets.mock_tests.length>0) {
        const m = prepAssets.mock_tests[0]
        const test = { title: m.title || 'Manual Mock Test', questions: (m.questions||[]).map(q=> typeof q === 'string' ? q : (q.text||q)) }
        setSelectedMockTest(test)
        return
      }
      if (extras && extras.mockInterview && extras.mockInterview.length>0) {
        const qs = extras.mockInterview.map(q=> typeof q === 'string' ? q : (q.text||q))
        setSelectedMockTest({ title: 'Manual Mock (from extras)', questions: qs })
        return
      }
      if (results && results.length>0) {
        const r = results.find(rr=> rr.extras && rr.extras.mockInterview && rr.extras.mockInterview.length>0)
        if (r) {
          const qs = r.extras.mockInterview.flatMap(round => (round.questions||[]).map(q=> q.text || q))
          setSelectedMockTest({ title: 'Manual Mock (from result)', questions: qs })
          return
        }
      }
      setError('No mock questions available to run a manual test')
    }catch(e){ setError('Failed to start manual test') }
  }

  return (
    <div className="app-container max-w-5xl">
      <div className="card p-6 md:p-8">
        <h1 className="page-title">Semantic Search</h1>
        <p className="page-subtitle mt-1">Find role-specific interview questions, prep assets, and guided mock rounds.</p>

        <form onSubmit={search} className="mt-6 flex flex-col gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search problems, topics or experiences" className="field" />
          <div className="grid md:grid-cols-4 gap-2">
            <select value={company} onChange={onCompanyChange} className="field md:col-span-2">
            <option value="">All companies</option>
            {companies.map(c=> <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            <select value={role} onChange={onRoleChange} className="field">
              <option value="">Any role</option>
              {roles.map(r=> <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>

            <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="field">
              <option value="">Any</option>
              {availableDifficulties.map(d=> <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showPerResultExtras} onChange={e=>setShowPerResultExtras(e.target.checked)} />
              <span>Show extras per result</span>
            </label>
            <button className="btn-primary px-5 py-2.5">Search</button>
          </div>
        </form>
      </div>

      {selectedMockTest && (
        <div className="mt-6">
          <MockTestRunner mockTest={selectedMockTest} onClose={()=>setSelectedMockTest(null)} />
        </div>
      )}

      {(searched || prepAssets || extras) && (
        <div className="mt-4 space-y-4">
          {prepAssets?.mock_tests && prepAssets.mock_tests.length > 0 && (
            <div className="card p-4">
              <div className="mb-3 font-semibold text-slate-900">Scored Mock Tests</div>
              <div className="space-y-2">
                {prepAssets.mock_tests.map((test, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const normalized = toScoredMockTest(test, company, role)
                      if (normalized) {
                        setSelectedMockTest(normalized)
                      } else {
                        setError('This mock has no answer key, so it cannot be scored.')
                      }
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white hover:bg-indigo-50 transition text-sm border border-slate-200"
                  >
                    <div className="font-medium text-slate-900">{test.title || `Test ${idx + 1}`}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {test.questions?.length || 0} questions • score tracked in roadmap and cognitive profile
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {extras && (
          <div className="card p-4">
            <div className="mb-2 font-semibold text-slate-900">Resources & References</div>
            {extras.resources && extras.resources.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {extras.resources.map((r,i)=> (
                  <li key={i}>
                    {/^https?:\/\//.test(r) ? (
                      <a href={r} target="_blank" rel="noreferrer" className="text-indigo-700 hover:text-indigo-800">{r}</a>
                    ) : (
                      <span>{r}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-500">No references found</div>
            )}

            {extras.mockInterview && extras.mockInterview.length > 0 && (
              <>
                <div className="mt-4 mb-2 font-semibold text-slate-900">Mock Interview (sample questions)</div>
                <ol className="list-decimal pl-5 text-sm text-slate-700">
                  {extras.mockInterview.map((q,i)=> <li key={i}>{q}</li>)}
                </ol>
              </>
            )}
          </div>
        )}

        {error && <div className="text-red-700">{error}</div>}

        {searched && results.length === 0 && <div className="text-slate-600">No results yet</div>}

        {results.map((r,i)=> (
          <div key={i}>
            <SearchResultCard item={r} />
            {showPerResultExtras && r.extras && (
              <div className="card p-3 mt-2">
                <div className="text-sm font-medium text-slate-900">Resources</div>
                {r.extras.resources && r.extras.resources.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-slate-700">
                    {r.extras.resources.map((u,idx)=> (
                      <li key={idx}>{/^https?:\/\//.test(u) ? <a href={u} target="_blank" rel="noreferrer" className="text-indigo-700 hover:text-indigo-800">{u}</a> : <span>{u}</span>}</li>
                    ))}
                  </ul>
                ) : <div className="text-slate-500">No resources</div>}

                {r.extras.generatedPrompt && (
                  <div className="mt-2 text-sm text-slate-700"><strong>Practice Prompt:</strong> {r.extras.generatedPrompt}</div>
                )}

                {r.extras.mockInterview && r.extras.mockInterview.length > 0 && (
                  <div className="mt-3">
                    {r.extras.mockInterview.map((round,ri)=> (
                          <div key={ri} className="mb-2">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-slate-900">{round.title} — ~{round.estimatedMinutes} mins</div>
                              <div>
                                <button onClick={()=>{
                                  const test = {
                                    title: round.title || `Round ${ri+1}`,
                                    questions: (round.questions || []).map((item) => ({
                                      text: item.text || 'Question',
                                      options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                      answerIndex: 0
                                    })),
                                    company: r.company || company || null,
                                    role: r.role || role || null
                                  }
                                  setSelectedMockTest(test)
                                }} className="btn-secondary px-2 py-1 text-sm">Start</button>
                              </div>
                            </div>
                            <ol className="list-decimal pl-6 text-sm text-slate-700">
                              {round.questions.map((qj,qjIdx)=> (
                                <li key={qjIdx}>{qj.text} <span className="text-xs text-slate-500">(~{qj.suggestedMinutes}m)</span></li>
                              ))}
                            </ol>
                          </div>
                        ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}