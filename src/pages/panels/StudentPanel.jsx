import React, { useState, useEffect } from 'react'
import api from '../../api'
import CognitiveProfile from '../../components/CognitiveProfile'
import { buildRoadmapFromStudentData } from '../../utils/roadmapBuilder'

const ROLES = ['Software Engineer','Frontend Developer','Backend Developer','Full Stack Developer','Data Scientist','Data Analyst','DevOps Engineer','Product Manager']
const COMPANIES = ['Amazon','Google','Microsoft','Meta','Apple','Flipkart','Adobe','Zoho','TCS','Infosys','Wipro']
const RISK_COLOR = { HIGH: 'text-red-700 bg-red-50 border-red-200', MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200', LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200' }

export default function StudentPanel() {
  const [activeTab, setActiveTab] = useState('profile') // 'profile' or 'roadmap'
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
    setGenerating(true)
    setError(null)
    setAgentInsights(null)
    setIsAiGenerated(false)

    try {
      const hasMockData = studentData?.summary?.totalTests > 0

      if (hasMockData) {
        try {
          const res = await api.post('/ai/autonomous-plan', {
            company: selectedCompany,
            role: selectedRole,
            daysRequired
          })
          setRoadmap(res.data)
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

      // Fallback: rule-based
      if (!studentData?.weakestSubjects?.length) {
        setError('Complete at least one mock test to generate a roadmap.')
        return
      }
      setRoadmap(buildRoadmapFromStudentData(studentData, selectedRole, daysRequired))
    } catch (err) {
      console.error('Error generating roadmap:', err)
      setError('Failed to generate roadmap. Please try again.')
    } finally {
      setGenerating(false)
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
    <div className="app-container max-w-7xl">
      <h2 className="page-title mb-6">📊 My Learning Dashboard</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}
        >
          📈 Cognitive Profile
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          className={activeTab === 'roadmap' ? 'btn-primary' : 'btn-ghost'}
        >
          🗺️ Personalized Roadmap
        </button>
      </div>

      {/* Error Message */}
      {error && activeTab === 'profile' && (
        <div className="card p-4 mb-6 bg-red-50 border border-red-200">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchStudentData}
            className="mt-2 btn-secondary text-sm py-1.5"
          >
            Retry
          </button>
        </div>
      )}

      {/* Cognitive Profile Tab */}
      {activeTab === 'profile' && studentData && (
        <div>
          <CognitiveProfile studentData={studentData} />

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="card p-4 text-center">
              <p className="text-sm text-slate-500 mb-2">Tests Completed</p>
              <p className="text-3xl font-bold text-indigo-700">{studentData.summary?.totalTests || 0}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-slate-500 mb-2">Overall Accuracy</p>
              <p className={`text-3xl font-bold ${
                studentData.summary?.avgScorePercentage >= 75 ? 'text-emerald-700' :
                studentData.summary?.avgScorePercentage >= 50 ? 'text-amber-700' :
                'text-red-700'
              }`}>
                {studentData.summary?.avgScorePercentage || 0}%
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-slate-500 mb-2">Total Attempts</p>
              <p className="text-3xl font-bold text-violet-700">{studentData.summary?.totalAttempts || 0}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-slate-500 mb-2">Avg Speed</p>
              <p className="text-3xl font-bold text-sky-700">
                {studentData.summary?.avgSecondsPerQuestion ? `${Math.round(studentData.summary.avgSecondsPerQuestion)}s` : '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personalized Roadmap Tab */}
      {activeTab === 'roadmap' && (
        <div>
          {/* Roadmap Generator Section */}
          <div className="card p-6 mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">🎯 Generate Your Roadmap</h3>

            <div className="space-y-4">
                {/* Company + Role */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Target Company</label>
                    <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="field">
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Target Role</label>
                    <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="field">
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Study Timeline: <b>{daysRequired} days</b></label>
                  <input
                    type="range" min="7" max="90" value={daysRequired}
                    onChange={(e) => setDaysRequired(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>7 days</span><span>90 days</span></div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateRoadmap}
                  disabled={generating}
                  className="btn-primary w-full py-3 disabled:opacity-50"
                >
                  {generating ? '⏳ AI Agent Running...' : '🤖 Generate AI Roadmap'}
                </button>
                {!studentData?.summary?.totalTests && (
                  <p className="text-xs text-slate-500 text-center">No mock tests yet — will use rule-based plan instead</p>
                )}
              </div>
          </div>

          {/* Generated Roadmap Display */}
          {roadmap && (
            <div className="space-y-6">

              {/* AI / Rule-based badge + agent insights */}
              <div className="card p-5 border border-indigo-100 bg-indigo-50">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h4 className="font-semibold text-indigo-800">
                    {roadmap.selectedRole} — {roadmap.daysRequired}-Day Plan
                  </h4>
                  {isAiGenerated ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300">🤖 AI Agent</span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">📐 Rule-Based</span>
                  )}
                  {agentInsights?.riskAssessment?.riskLevel && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ RISK_COLOR[agentInsights.riskAssessment.riskLevel] || RISK_COLOR.LOW }`}>
                      Risk: {agentInsights.riskAssessment.riskLevel}
                    </span>
                  )}
                </div>

                {agentInsights && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    {agentInsights.riskAssessment && (
                      <div className={`p-3 rounded-xl border ${ RISK_COLOR[agentInsights.riskAssessment.riskLevel] || RISK_COLOR.LOW }`}>
                        <div className="text-xs font-semibold mb-1">Risk Level</div>
                        <div className="font-bold">{agentInsights.riskAssessment.riskLevel}</div>
                        {agentInsights.riskAssessment.reasoning && (
                          <div className="text-xs mt-1 opacity-80">{agentInsights.riskAssessment.reasoning}</div>
                        )}
                      </div>
                    )}
                    {agentInsights.performanceAnalysis && (
                      <div className="p-3 bg-white rounded-xl border border-indigo-200 text-xs text-slate-700">
                        <div className="font-semibold text-indigo-700 mb-1">Performance</div>
                        <div>Avg: <b>{agentInsights.performanceAnalysis.averageScore}%</b></div>
                        {agentInsights.performanceAnalysis.weakTopics?.length > 0 && <div className="mt-1">Weak: {agentInsights.performanceAnalysis.weakTopics.slice(0,3).join(', ')}</div>}
                        {agentInsights.performanceAnalysis.strongTopics?.length > 0 && <div className="mt-1">Strong: {agentInsights.performanceAnalysis.strongTopics.slice(0,2).join(', ')}</div>}
                      </div>
                    )}
                    {agentInsights.coachRecommendations && (
                      <div className="p-3 bg-white rounded-xl border border-indigo-200 text-xs text-slate-700">
                        <div className="font-semibold text-indigo-700 mb-1">Coach</div>
                        <div>Focus: <b>{agentInsights.coachRecommendations.focusArea}</b></div>
                        <ul className="mt-1 space-y-0.5">{(agentInsights.coachRecommendations.nextTasks||[]).slice(0,2).map((t,i)=><li key={i}>• {t}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}

                {agentInsights?.actionsTaken?.length > 0 && (
                  <button onClick={() => setShowAgentThinking(v => !v)} className="text-xs text-indigo-600 underline">
                    {showAgentThinking ? 'Hide' : 'Show'} agent execution steps ({agentInsights.actionsTaken.length})
                  </button>
                )}
                {showAgentThinking && (
                  <ol className="mt-2 space-y-1">
                    {agentInsights.actionsTaken.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-700">
                        <span className="w-5 h-5 flex-shrink-0 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold">{i+1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Success Criteria */}
              <div className="card p-6 bg-emerald-50 border-emerald-200">
                <h4 className="text-lg font-semibold text-emerald-800 mb-4">✅ Success Criteria</h4>
                <ul className="space-y-2">
                  {roadmap.successCriteria.map((criteria, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-emerald-600 font-bold mt-1">✓</span>
                      <span className="text-slate-700">{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weekly Milestones */}
              <div className="card p-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">📅 Weekly Milestones</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {roadmap.weeklyMilestones.map((milestone, idx) => (
                    <div key={idx} className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                      <p className="text-sm font-semibold text-indigo-700 mb-2">Week {milestone.week}</p>
                      <p className="text-xs text-slate-700">{milestone.goal}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {milestone.focus ? `Focus: ${milestone.focus}` : `~${milestone.tests || 2} practice items`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Topic Breakdown */}
              <div className="card p-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">🎓 Focus Topics</h4>
                <div className="space-y-4">
                  {roadmap.topics.map((topic, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-indigo-800">{idx + 1}. {topic.topic}</p>
                          <p className="text-xs text-slate-500">Days {topic.day}-{topic.endDay}</p>
                        </div>
                        <span className="btn-secondary text-xs py-1 px-3">Focused Track</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-2">Subtopics:</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {topic.subtopics.map((sub, i) => (
                              <li key={i}>• {sub}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-2">Suggested Tests:</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {topic.suggestedTests.map((test, i) => (
                              <li key={i}>• {test}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-slate-700">
                        <p className="font-semibold text-amber-800 mb-1">Daily Goal:</p>
                        <p>{topic.dailyGoal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && activeTab === 'roadmap' && (
            <div className="card p-4 text-center bg-red-50 border-red-200 text-red-700">{error}</div>
          )}
        </div>
      )}
    </div>
  )
}
