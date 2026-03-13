import React, { useEffect, useState } from 'react'
import getTokenPayload from '../utils/auth'
import api from '../api'

function isRoadmapPracticeTitle(title = '') {
  return /^Roadmap Practice \| Day \d+ \|/i.test(String(title).trim())
}

// Helper to calculate statistics
function calculateStats(tests) {
  let totalScore = 0
  let totalQuestions = 0
  const testPercentages = []
  
  tests.forEach(test => {
    if (isRoadmapPracticeTitle(test.title)) {
      return
    }
    test.attempts?.forEach(att => {
      totalScore += att.score
      totalQuestions += att.total
      const pct = Math.round((att.score / att.total) * 100)
      testPercentages.push(pct)
    })
  })
  
  const avgPercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0
  const maxPercentage = testPercentages.length > 0 ? Math.max(...testPercentages) : 0
  const minPercentage = testPercentages.length > 0 ? Math.min(...testPercentages) : 0
  
  return { avgPercentage, maxPercentage, minPercentage, totalAttempts: testPercentages.length }
}

// Helper to get color based on percentage
function getPercentageColor(percentage) {
  if (percentage >= 80) return '#86d03c' // green
  if (percentage >= 60) return '#fbbf24' // yellow
  return '#f87171' // red
}

// Progress bar component
function ProgressBar({ percentage, label }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#07111a] font-medium">{label}</span>
        <span className="font-semibold" style={{color: getPercentageColor(percentage)}}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{width: `${percentage}%`, backgroundColor: getPercentageColor(percentage)}}
        />
      </div>
    </div>
  )
}

// Cognitive Profile & Risk Assessment
function calculateCognitiveProfile(rawScoreboard) {
  const profiles = {}
  
  rawScoreboard.forEach(test => {
    const studentId = test.userId || 'unknown'
    if (!profiles[studentId]) {
      profiles[studentId] = {
        studentId,
        totalTests: 0,
        totalAccuracy: 0,
        totalAttempts: 0,
        totalDuration: 0,
        totalQuestionsAnswered: 0,
        testRecords: [],
        riskFactors: [],
        riskScore: 0
      }
    }
    
    profiles[studentId].totalTests += 1
    profiles[studentId].totalAccuracy += (test.accuracy_percent || 0)
    profiles[studentId].totalAttempts += (test.attempts || 1)
    profiles[studentId].totalDuration += (test.duration_seconds || 0)
    profiles[studentId].totalQuestionsAnswered += (test.total_questions || 0)
    profiles[studentId].testRecords.push({
      title: test.title,
      accuracy: test.accuracy_percent,
      attempts: test.attempts,
      duration: test.duration_seconds
    })
  })
  
  // Calculate averages and assess risk
  Object.values(profiles).forEach(profile => {
    profile.avgAccuracy = Math.round(profile.totalAccuracy / profile.totalTests)
    profile.avgAttempts = Math.round((profile.totalAttempts / profile.totalTests) * 10) / 10
    profile.avgDuration = Math.round(profile.totalDuration / profile.totalTests)
    profile.avgSecondsPerQuestion = profile.totalQuestionsAnswered > 0 
      ? Math.round((profile.totalDuration / profile.totalQuestionsAnswered) * 10) / 10
      : 0
    
    let riskScore = 0
    
    // Risk Factor 1: Low Accuracy (< 50%)
    if (profile.avgAccuracy < 50) {
      profile.riskFactors.push({ type: 'Low Accuracy', severity: 'critical', value: `${profile.avgAccuracy}%` })
      riskScore += 40
    } else if (profile.avgAccuracy < 60) {
      profile.riskFactors.push({ type: 'Below Average Accuracy', severity: 'high', value: `${profile.avgAccuracy}%` })
      riskScore += 25
    }
    
    // Risk Factor 2: High Attempts (3+ per test)
    if (profile.avgAttempts >= 3) {
      profile.riskFactors.push({ type: 'High Attempt Rate', severity: 'high', value: `${profile.avgAttempts} attempts/test` })
      riskScore += 25
    } else if (profile.avgAttempts >= 2) {
      profile.riskFactors.push({ type: 'Multiple Attempts', severity: 'medium', value: `${profile.avgAttempts} attempts/test` })
      riskScore += 15
    }
    
    // Risk Factor 3: Slow Performance (> 60 seconds per question)
    if (profile.avgSecondsPerQuestion > 60) {
      profile.riskFactors.push({ type: 'Slow Pace', severity: 'medium', value: `${profile.avgSecondsPerQuestion}s/question` })
      riskScore += 15
    }
    
    // Risk Factor 4: Declining Performance (last 3 tests show trend)
    if (profile.testRecords.length >= 3) {
      const last3 = profile.testRecords.slice(-3)
      const accuracies = last3.map(t => t.accuracy || 0)
      if (accuracies[2] < accuracies[1] && accuracies[1] < accuracies[0]) {
        profile.riskFactors.push({ type: 'Declining Trend', severity: 'high', value: `${accuracies[0]}% → ${accuracies[2]}%` })
        riskScore += 20
      }
    }
    
    profile.riskScore = Math.min(riskScore, 100)
  })
  
  return profiles
}

// Get risk level badge
function getRiskLevel(riskScore) {
  if (riskScore >= 70) return { label: 'Critical', color: '#dc2626', bgColor: '#fee2e2' }
  if (riskScore >= 50) return { label: 'High', color: '#ea580c', bgColor: '#fed7aa' }
  if (riskScore >= 30) return { label: 'Medium', color: '#f59e0b', bgColor: '#fef3c7' }
  return { label: 'Low', color: '#16a34a', bgColor: '#dcfce7' }
}

export default function Scoreboard(){
  const [scoreboard, setScoreboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [groupedByStudent, setGroupedByStudent] = useState({})
  const [studentStats, setStudentStats] = useState({})
  const [cognitiveProfiles, setCognitiveProfiles] = useState({})
  const [highRiskStudents, setHighRiskStudents] = useState([])

  useEffect(()=>{
    let mounted = true
    
    // Get user role
    try {
      const payload = getTokenPayload()
      if (payload) setUserRole(payload.role)
    } catch (e) {
      console.error('Failed to get user role', e)
    }

    const fetchScoreboard = async ()=>{
      try{
        setLoading(true)
        const { data } = await api.get('/scoreboard')
        if (!mounted) return
        
        setScoreboard(data.scoreboard || [])
        
        // For admin view only, group by userId and calculate stats
        if (data.role === 'admin') {
          const grouped = {}
          const stats = {}
          
          (data.scoreboard || []).forEach(test => {
            const studentId = test.userId || 'unknown'
            if (!grouped[studentId]) {
              grouped[studentId] = []
            }
            grouped[studentId].push(test)
          })
          
          // Calculate stats for each student
          Object.entries(grouped).forEach(([studentId, tests]) => {
            stats[studentId] = calculateStats(tests)
          })
          
          // Calculate cognitive profiles and assess risk
          const profiles = calculateCognitiveProfile(data.scoreboard || [])
          setCognitiveProfiles(profiles)
          
          // Identify high-risk students (riskScore >= 30)
          const atRisk = Object.values(profiles)
            .filter(profile => profile.riskScore >= 30)
            .sort((a, b) => b.riskScore - a.riskScore)
          
          setHighRiskStudents(atRisk)
          setGroupedByStudent(grouped)
          setStudentStats(stats)
        }
      }catch(err){
        console.error('Failed to fetch scoreboard', err)
      }finally{
        if (mounted) setLoading(false)
      }
    }
    fetchScoreboard()
    return ()=>{ mounted = false }
  }, [])

  if (loading) return <div className="text-[#07111a]">Loading scoreboard...</div>

  const isAdminView = userRole === 'admin'
  const isSuperAdmin = userRole === 'super_admin'

  // Super admin doesn't have access to student scoreboard
  if (isSuperAdmin) {
    return (
      <div className="card p-4">
        <h3 className="mb-4 font-semibold text-[#07111a]">Student Scoreboard</h3>
        <div className="text-[#6b7280] text-sm p-4 bg-blue-50 rounded border border-blue-200">
          Student scoreboard is only available to Admin users. Super Admin role does not have access to detailed student performance data.
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <h3 className="mb-4 font-semibold text-[#07111a]">
        {isAdminView ? 'All Students Scoreboard' : 'Mock Test Scoreboard'}
      </h3>
      {scoreboard.length === 0 ? (
        <div className="text-[#6b7280] text-sm">
          {isAdminView ? 'No student test attempts yet.' : 'No test attempts yet. Start a mock test to see your scores here.'}
        </div>
      ) : isAdminView ? (
        // Admin view: student performance summary + grouped details
        <div className="space-y-6">
          {/* Smart Intervention Alerts - Cognitive Risk Assessment */}
          {highRiskStudents.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-5 border-2 border-red-300">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-red-900 flex items-center">
                  <span className="text-2xl mr-2">⚠️</span>
                  Intervention Required - {highRiskStudents.length} Student{highRiskStudents.length !== 1 ? 's' : ''} at Risk
                </h4>
                <div className="text-sm text-red-600 font-semibold">
                  Cognitive Risk Analysis
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {highRiskStudents.slice(0, 6).map((profile) => {
                  const riskLevel = getRiskLevel(profile.riskScore)
                  return (
                    <div key={profile.studentId} className="bg-white rounded-lg p-4 border-l-4" style={{borderColor: riskLevel.color}}>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-bold text-[#07111a]">Student {profile.studentId}</div>
                          <div className="text-xs text-slate-500 mt-1">{profile.totalTests} tests analyzed</div>
                        </div>
                        <div className="text-right">
                          <div 
                            className="px-3 py-1 rounded-full text-sm font-bold text-white"
                            style={{backgroundColor: riskLevel.color}}
                          >
                            {riskLevel.label}
                          </div>
                          <div className="text-xl font-bold mt-1" style={{color: riskLevel.color}}>
                            {profile.riskScore}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="bg-slate-100 p-2 rounded">
                          <div className="text-slate-600">Avg Accuracy</div>
                          <div className="font-bold" style={{color: getPercentageColor(profile.avgAccuracy)}}>
                            {profile.avgAccuracy}%
                          </div>
                        </div>
                        <div className="bg-slate-100 p-2 rounded">
                          <div className="text-slate-600">Avg Attempts</div>
                          <div className="font-bold text-orange-600">
                            {profile.avgAttempts}/test
                          </div>
                        </div>
                      </div>
                      
                      {/* Risk Factors */}
                      <div className="space-y-1">
                        {profile.riskFactors.map((factor, idx) => {
                          const severityColor = 
                            factor.severity === 'critical' ? '#dc2626' :
                            factor.severity === 'high' ? '#ea580c' :
                            '#f59e0b'
                          return (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span 
                                className="inline-block w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                                style={{backgroundColor: severityColor}}
                              ></span>
                              <span className="text-slate-700">
                                <strong>{factor.type}:</strong> {factor.value}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Recommendation */}
                      <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-xs font-semibold text-blue-900">
                          💡 Suggestion:
                          {profile.riskScore >= 70 && ' Prioritize immediate tutoring'}
                          {profile.riskScore >= 50 && profile.riskScore < 70 && ' Schedule intervention meeting'}
                          {profile.riskScore < 50 && ' Monitor progress closely'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {highRiskStudents.length > 6 && (
                <div className="text-center text-sm text-red-600 font-semibold mt-3">
                  ... and {highRiskStudents.length - 6} more students at risk
                </div>
              )}
            </div>
          )}
          
          {highRiskStudents.length === 0 && scoreboard.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-300">
              <div className="flex items-center text-green-800">
                <span className="text-2xl mr-2">✅</span>
                <div>
                  <div className="font-bold">No High-Risk Students</div>
                  <div className="text-sm">All students are performing at acceptable levels</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Student Performance Leaderboard */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
              <span className="inline-block w-5 h-5 rounded-full mr-2 bg-indigo-500"></span>
              Student Performance Summary
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(studentStats)
                .sort(([,a], [,b]) => b.avgPercentage - a.avgPercentage)
                .map(([studentId, stats], idx) => (
                  <div key={studentId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="font-bold text-slate-900 min-w-[2rem] text-center">
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 text-sm">Student {studentId}</div>
                        <div className="text-xs text-[#6b7280]">{stats.totalAttempts} attempt{stats.totalAttempts !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{color: getPercentageColor(stats.avgPercentage)}}>
                          {stats.avgPercentage}%
                        </div>
                        <div className="text-xs text-[#6b7280]">Avg Score</div>
                      </div>
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{width: `${stats.avgPercentage}%`, backgroundColor: getPercentageColor(stats.avgPercentage)}}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Detailed Student Performance */}
          <div className="space-y-6">
            {Object.entries(groupedByStudent).map(([studentId, tests]) => {
              const stats = studentStats[studentId] || {}
              return (
                <div key={studentId} className="border-l-4 border-indigo-400 pl-4 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-[#07111a]">Student ID: {studentId}</h4>
                      <p className="text-xs text-[#6b7280] mt-1">{stats.totalAttempts || 0} test attempt{stats.totalAttempts !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{color: getPercentageColor(stats.avgPercentage)}}>
                        {stats.avgPercentage}%
                      </div>
                      <div className="text-xs text-[#6b7280]">Average Score</div>
                    </div>
                  </div>
                  
                  {/* Performance Chart */}
                  <div className="bg-slate-50 rounded p-3 mb-4 space-y-3">
                    <ProgressBar percentage={stats.avgPercentage} label="Overall Average" />
                    <ProgressBar percentage={stats.maxPercentage} label="Best Score" />
                    <ProgressBar percentage={stats.minPercentage} label="Lowest Score" />
                  </div>

                  {/* Test Details */}
                  <div className="space-y-3">
                    {tests.map((test, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm text-slate-900">{test.title}</div>
                            {(test.company || test.role) && (
                              <div className="text-xs text-slate-500 mt-1">
                                {test.company} {test.role && `- ${test.role}`}
                              </div>
                            )}
                            {isRoadmapPracticeTitle(test.title) && (
                              <div className="text-[11px] text-emerald-700 mt-1 font-medium">Roadmap attendance tracked</div>
                            )}
                          </div>
                          <div className="text-xs text-slate-600">
                            {test.attempts.length} attempt{test.attempts.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                          {test.attempts.map((att, aidx) => {
                            if (isRoadmapPracticeTitle(test.title)) {
                              return (
                                <div key={aidx} className="flex justify-between items-center text-xs">
                                  <div className="text-slate-700">Attempt {test.attempts.length - aidx}</div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-emerald-700">Attended</span>
                                    <span className="text-[#9ca3af]">{new Date(att.date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              )
                            }
                            const pct = Math.round((att.score / att.total) * 100)
                            return (
                              <div key={aidx} className="flex justify-between items-center text-xs">
                                <div className="text-slate-700">Attempt {test.attempts.length - aidx}</div>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full" style={{width: `${pct}%`, backgroundColor: getPercentageColor(pct)}} />
                                  </div>
                                  <span className="font-semibold text-[#86d03c] w-10 text-right">{pct}%</span>
                                  <span className="text-[#6b7280] w-12">{att.score}/{att.total}</span>
                                  <span className="text-[#9ca3af]">{new Date(att.date).toLocaleDateString()}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        // Student view: their own scores with charts
        <div className="space-y-4">
          {/* Student's Performance Summary */}
          {scoreboard.length > 0 && (() => {
            const stats = calculateStats(scoreboard)
            return (
              <div className="bg-white rounded-xl p-4 mb-4 border border-slate-200 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Your Performance</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{color: getPercentageColor(stats.avgPercentage)}}>
                      {stats.avgPercentage}%
                    </div>
                    <div className="text-xs text-[#6b7280] mt-1">Average</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{color: getPercentageColor(stats.maxPercentage)}}>
                      {stats.maxPercentage}%
                    </div>
                    <div className="text-xs text-[#6b7280] mt-1">Best</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{color: getPercentageColor(stats.minPercentage)}}>
                      {stats.minPercentage}%
                    </div>
                    <div className="text-xs text-[#6b7280] mt-1">Lowest</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <ProgressBar percentage={stats.avgPercentage} label="Overall Progress" />
                </div>
              </div>
            )
          })()}
          
          {/* Test Scores */}
          <div className="space-y-3">
            {scoreboard.map((test, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{test.title}</div>
                    {(test.company || test.role) && (
                      <div className="text-xs text-slate-500 mt-1">
                        {test.company} {test.role && `- ${test.role}`}
                      </div>
                    )}
                    {isRoadmapPracticeTitle(test.title) && (
                      <div className="text-[11px] text-emerald-700 mt-1 font-medium">Roadmap attendance tracked</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    {test.attempts.length} attempt{test.attempts.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {test.attempts.map((att, aidx) => {
                    if (isRoadmapPracticeTitle(test.title)) {
                      return (
                        <div key={aidx} className="flex justify-between items-center text-xs">
                          <div className="text-slate-700">Attempt {test.attempts.length - aidx}</div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-700">Attended</span>
                            <span className="text-[#9ca3af]">{new Date(att.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )
                    }
                    const pct = Math.round((att.score / att.total) * 100)
                    return (
                      <div key={aidx} className="flex justify-between items-center text-xs">
                        <div className="text-slate-700">Attempt {test.attempts.length - aidx}</div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full" style={{width: `${pct}%`, backgroundColor: getPercentageColor(pct)}} />
                          </div>
                          <span className="font-semibold text-[#86d03c] w-10 text-right">{pct}%</span>
                          <span className="text-[#6b7280] w-12">{att.score}/{att.total}</span>
                          <span className="text-[#9ca3af]">{new Date(att.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
