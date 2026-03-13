import React, { useState, useEffect } from 'react'
import api from '../../api'
import CognitiveProfile from '../../components/CognitiveProfile'
import { buildRoadmapFromStudentData } from '../../utils/roadmapBuilder'

const ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Data Scientist', 'Data Analyst',
  'DevOps Engineer', 'Product Manager'
]

const COMPANIES = [
  'Amazon', 'Google', 'Microsoft', 'Meta', 'Apple',
  'Flipkart', 'Adobe', 'Zoho', 'TCS', 'Infosys', 'Wipro'
]

const RISK_COLOR = { HIGH: 'text-red-700 bg-red-50 border-red-200', MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200', LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200' }

export default function PersonalizedRoadmap(){
  const [studentData, setStudentData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [daysRequired, setDaysRequired] = useState(30)
  const [roadmap, setRoadmap] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [selectedRole, setSelectedRole] = useState('Software Engineer')
  const [selectedCompany, setSelectedCompany] = useState('Amazon')
  const [agentInsights, setAgentInsights] = useState(null)
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [showAgentThinking, setShowAgentThinking] = useState(false)
  const [completedRoadmapDays, setCompletedRoadmapDays] = useState(new Set())
  const [savingRoadmapDays, setSavingRoadmapDays] = useState(new Set())

  const getRoadmapPracticeTitle = (day, company, role) => `Roadmap Practice | Day ${day} | ${company} | ${role}`

  const loadCompletedRoadmapDays = async (currentRoadmap) => {
    const company = String(currentRoadmap?.company || selectedCompany || '').trim().toLowerCase()
    const role = String(currentRoadmap?.selectedRole || selectedRole || '').trim().toLowerCase()

    if (!company || !role) {
      setCompletedRoadmapDays(new Set())
      return
    }

    try {
      const res = await api.get('/scoreboard')
      const rows = Array.isArray(res?.data?.scoreboard) ? res.data.scoreboard : []
      const completed = new Set()

      rows.forEach((item) => {
        const title = String(item?.title || '').trim()
        const match = /^Roadmap Practice \| Day (\d+) \| (.+?) \| (.+)$/i.exec(title)
        if (!match) return

        const day = Number(match[1])
        const itemCompany = String(match[2] || '').trim().toLowerCase()
        const itemRole = String(match[3] || '').trim().toLowerCase()

        if (Number.isFinite(day) && day > 0 && itemCompany === company && itemRole === role) {
          completed.add(day)
        }
      })

      setCompletedRoadmapDays(completed)
    } catch (err) {
      console.error('Failed to load completed roadmap practice days:', err)
    }
  }

  useEffect(() => {
    fetchStudentData()
  }, [])

  useEffect(() => {
    if (!studentData?.summary?.totalTests || roadmap || generating) {
      return
    }

    generateRoadmap()
  }, [studentData])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get(`/admin/analytics/my-profile`)
      setStudentData(res.data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load your performance data')
      setStudentData(null)
    } finally {
      setLoading(false)
    }
  }

  const generateRoadmap = async () => {
    try {
      setGenerating(true)
      setError(null)
      setAgentInsights(null)
      setIsAiGenerated(false)

      const hasMockData = studentData?.summary?.totalTests > 0

      if (hasMockData) {
        try {
          const res = await api.post('/ai/autonomous-plan', {
            company: selectedCompany,
            role: selectedRole,
            daysRequired
          })
          setRoadmap(res.data)
          await loadCompletedRoadmapDays(res.data)
          setAgentInsights({
            actionsTaken: res.data.actionsTaken || [],
            riskAssessment: res.data.riskAssessment || null,
            performanceAnalysis: res.data.performanceAnalysis || null,
            coachRecommendations: res.data.coachRecommendations || null,
            generatedAt: res.data.generatedAt || new Date().toISOString()
          })
          setIsAiGenerated(!!res.data.isAiGenerated)
          return
        } catch (aiErr) {
          console.warn('AI agent unavailable, using rule-based fallback:', aiErr?.response?.data?.message || aiErr.message)
        }
      }

      // Fallback: deterministic rule-based
      const generated = buildRoadmapFromStudentData(studentData, selectedRole, daysRequired)
      setRoadmap(generated)
      await loadCompletedRoadmapDays(generated)
    } catch (err) {
      console.error('Error generating roadmap:', err)
      setError('Failed to generate roadmap. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const markRoadmapPracticeDone = async (item) => {
    const company = roadmap?.company || selectedCompany
    const role = roadmap?.selectedRole || selectedRole
    const day = item?.day

    if (!day) return
    if (completedRoadmapDays.has(day) || savingRoadmapDays.has(day)) return

    const testTitle = getRoadmapPracticeTitle(day, company, role)

    setSavingRoadmapDays((prev) => {
      const next = new Set(prev)
      next.add(day)
      return next
    })

    try {
      await api.post('/scoreboard', {
        testTitle,
        company,
        role,
        score: 1,
        totalQuestions: 1,
        attempts: 1,
        accuracy_percent: 100
      })

      setCompletedRoadmapDays((prev) => {
        const next = new Set(prev)
        next.add(day)
        return next
      })
    } catch (err) {
      console.error('Failed to save roadmap practice result:', err)
      setError(err?.response?.data?.message || 'Failed to save roadmap practice result')
    } finally {
      setSavingRoadmapDays((prev) => {
        const next = new Set(prev)
        next.delete(day)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="app-container max-w-6xl">
        <div className="card p-8 text-center">
          <p className="text-slate-500">Loading your performance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container max-w-6xl">
      <h1 className="page-title mb-6">Personalized Road Map</h1>

      {/* Error Alert */}
      {error && (
        <div className="card p-4 mb-6 bg-red-50 border border-red-200">
          <p className="text-red-700 text-sm mb-2">{error}</p>
          <button
            onClick={fetchStudentData}
            className="btn-secondary text-xs py-1.5"
          >
            Retry Load Profile
          </button>
        </div>
      )}

      {/* Cognitive Profile Section */}
      {studentData && (
        <div className="mb-6">
          <CognitiveProfile studentData={studentData} />
        </div>
      )}

      {/* Roadmap Generator Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Select Your Target Role & Timeline</h2>
        <p className="text-sm text-slate-500 mb-6">
          Choose your target role and prepare with a structured study plan optimized for that position.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Company Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Target Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="field"
            >
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Target Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="field"
            >
              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Preparation Duration</label>
            <select
              value={daysRequired}
              onChange={(e) => setDaysRequired(parseInt(e.target.value))}
              className="field"
            >
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={generateRoadmap}
              disabled={generating}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? '⏳ AI Agent Running...' : '🤖 Generate AI Roadmap'}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Roadmap Display */}
      {roadmap && (
        <div className="space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-2xl font-bold text-indigo-700">
                {roadmap.selectedRole} — {roadmap.daysRequired} Day Preparation Plan
              </h2>
              {isAiGenerated ? (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">🤖 AI Agent</span>
              ) : (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">📐 Rule-Based</span>
              )}
              {agentInsights?.riskAssessment?.riskLevel && (
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  RISK_COLOR[agentInsights.riskAssessment.riskLevel] || RISK_COLOR.LOW
                }`}>
                  Risk: {agentInsights.riskAssessment.riskLevel}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">
              {isAiGenerated
                ? `AI roadmap for ${roadmap.company || selectedCompany} · generated ${agentInsights?.generatedAt ? new Date(agentInsights.generatedAt).toLocaleTimeString() : ''}`
                : 'Performance-based roadmap with milestones, topics, and daily goals'}
            </p>
          </div>

          {/* Agent Insights Panel */}
          {agentInsights && (
            <div className="card p-6 border border-indigo-100 bg-indigo-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-indigo-800">🤖 Agent Analysis</h3>
                <button
                  onClick={() => setShowAgentThinking(v => !v)}
                  className="text-xs text-indigo-600 underline"
                >
                  {showAgentThinking ? 'Hide' : 'Show'} agent steps
                </button>
              </div>

              {/* Risk + Performance row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {agentInsights.riskAssessment && (
                  <div className={`p-3 rounded-xl border ${ RISK_COLOR[agentInsights.riskAssessment.riskLevel] || RISK_COLOR.LOW }`}>
                    <div className="text-xs font-semibold mb-1">Risk Level</div>
                    <div className="text-lg font-bold">{agentInsights.riskAssessment.riskLevel}</div>
                    {agentInsights.riskAssessment.reasoning && (
                      <div className="text-xs mt-1 opacity-80">{agentInsights.riskAssessment.reasoning}</div>
                    )}
                  </div>
                )}
                {agentInsights.performanceAnalysis && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-200">
                    <div className="text-xs font-semibold text-indigo-700 mb-1">Performance Analysis</div>
                    <div className="text-xs text-slate-700">
                      <div>Avg Score: <b>{agentInsights.performanceAnalysis.averageScore}%</b></div>
                      {agentInsights.performanceAnalysis.weakTopics?.length > 0 && (
                        <div className="mt-1">Weak: {agentInsights.performanceAnalysis.weakTopics.slice(0,3).join(', ')}</div>
                      )}
                      {agentInsights.performanceAnalysis.strongTopics?.length > 0 && (
                        <div className="mt-1">Strong: {agentInsights.performanceAnalysis.strongTopics.slice(0,3).join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}
                {agentInsights.coachRecommendations && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-200">
                    <div className="text-xs font-semibold text-indigo-700 mb-1">Coach Recommendations</div>
                    <div className="text-xs text-slate-700">
                      <div>Focus: <b>{agentInsights.coachRecommendations.focusArea}</b></div>
                      <ul className="mt-1 space-y-0.5">
                        {(agentInsights.coachRecommendations.nextTasks || []).slice(0,3).map((t, i) => (
                          <li key={i}>• {t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Agent Thinking Steps */}
              {showAgentThinking && agentInsights.actionsTaken?.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-indigo-700 mb-2">Agent Execution Trace:</div>
                  <ol className="space-y-1">
                    {agentInsights.actionsTaken.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-700">
                        <span className="w-5 h-5 flex-shrink-0 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold">{i+1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Success Criteria */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">✅ Success Criteria</h3>
            <ul className="space-y-2">
              {roadmap.successCriteria.map((criterion, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-emerald-600 font-bold">→</span>
                  {criterion}
                </li>
              ))}
            </ul>
          </div>

          {/* Weekly Milestones */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">📅 Weekly Milestones</h3>
            <div className="grid gap-3">
              {roadmap.weeklyMilestones.map((milestone, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl border-l-4 border-l-indigo-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-indigo-700">Week {milestone.week}</div>
                      <div className="text-sm text-slate-700 mt-1">{milestone.goal}</div>
                    </div>
                    <div className="text-sm text-slate-500">~{milestone.tests} items</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Practice Links */}
          {Array.isArray(roadmap.dailyPlan) && roadmap.dailyPlan.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">🔗 Daily Practice Links</h3>
              <div className="grid gap-2 max-h-[28rem] overflow-y-auto pr-1">
                {roadmap.dailyPlan.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-indigo-700">Day {item.day}</div>
                      <div className="text-sm text-slate-700">{item.focus}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={item.practiceLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-800 underline break-all"
                      >
                        Open practice link
                      </a>
                      <button
                        onClick={() => markRoadmapPracticeDone(item)}
                        disabled={savingRoadmapDays.has(item.day) || completedRoadmapDays.has(item.day)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {completedRoadmapDays.has(item.day)
                          ? 'Saved to scoreboard'
                          : savingRoadmapDays.has(item.day)
                            ? 'Saving...'
                            : 'Mark done'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topic Breakdown */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">📚 Focus Topics</h3>
            <div className="grid gap-4">
              {roadmap.topics.map((topic, idx) => (
                <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-indigo-800">#{idx + 1} {topic.topic}</div>
                      <div className="text-xs text-slate-500 mt-1">Day {topic.day} - {topic.endDay}</div>
                    </div>
                    <div className="text-xs bg-amber-50 border border-amber-100 text-amber-800 px-2 py-1 rounded-lg">{topic.dailyGoal}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-2">Subtopics:</div>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {topic.subtopics.map((sub, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-indigo-500">•</span>
                            {sub}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-2">Suggested Tests:</div>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {topic.suggestedTests.map((test, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-emerald-500">→</span>
                            {test}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
