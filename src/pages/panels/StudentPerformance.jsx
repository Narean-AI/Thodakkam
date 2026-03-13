import React, { useState, useEffect } from 'react'
import api from '../../api'
import CognitiveProfile from '../../components/CognitiveProfile'

export default function StudentPerformance() {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentData, setStudentData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSection, setExpandedSection] = useState('weakest')

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/admin/analytics/students')
      setStudents(res.data.students || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load students')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const selectStudent = async (student) => {
    try {
      setLoading(true)
      setError(null)
      setSelectedStudent(student)
      const res = await api.get(`/admin/analytics/students/${student.id}`)
      setStudentData(res.data)
      setExpandedSection('weakest')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load student performance')
      setStudentData(null)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowEngagementStudents = filteredStudents.filter((student) => student.lowEngagement)

  const toggleSection = (key) => {
    setExpandedSection((prev) => (prev === key ? '' : key))
  }

  const formatDuration = (seconds) => {
    const total = Number(seconds) || 0
    const hrs = Math.floor(total / 3600)
    const mins = Math.floor((total % 3600) / 60)
    if (hrs > 0) return `${hrs}h ${mins}m`
    return `${mins}m`
  }

  return (
    <div className="app-container max-w-7xl">
      <h1 className="page-title mb-1">Student Performance Analytics</h1>
      <p className="page-subtitle mb-6">Track engagement, weak areas, and test outcomes per student.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Student List */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Students</h2>

            {lowEngagementStudents.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <div className="text-sm font-semibold text-amber-800">
                  ⚠ Low Engagement Alerts ({lowEngagementStudents.length})
                </div>
                <div className="mt-1 text-xs text-amber-700">
                  Students with less than 2 logins in the last 7 days.
                </div>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto pr-1">
                  {lowEngagementStudents.map((student) => (
                    <div key={`alert-${student.id}`} className="text-xs text-amber-800 rounded-lg border border-amber-200/70 bg-white/60 px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{student.name}</span>
                        <span className="font-semibold whitespace-nowrap">
                          {student.weeklyLogins || 0} logins · {formatDuration(student.weeklyActiveSeconds)}
                        </span>
                      </div>
                      <div className="opacity-80 mt-0.5">
                        Weak: {student.weakestSubject || 'N/A'}{typeof student.weakestScore === 'number' ? ` (${student.weakestScore}%)` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field mb-4 text-sm"
            />

            {/* Student List */}
            <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No students found</p>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => selectStudent(student)}
                    className={`w-full text-left p-3 rounded-xl text-sm transition-all border ${
                      selectedStudent?.id === student.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-indigo-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-2">
                      <span>{student.name}</span>
                      {student.lowEngagement && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Low engagement
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-75 mt-0.5">{student.email}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${selectedStudent?.id === student.id ? 'border-white/40 bg-white/15' : 'border-slate-200 bg-slate-50'}`}>
                        {student.weeklyLogins || 0} logins
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${selectedStudent?.id === student.id ? 'border-white/40 bg-white/15' : 'border-slate-200 bg-slate-50'}`}>
                        {formatDuration(student.weeklyActiveSeconds)} weekly
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${selectedStudent?.id === student.id ? 'border-white/40 bg-white/15' : 'border-slate-200 bg-slate-50'}`}>
                        {student.totalTests || 0} tests
                      </span>
                    </div>
                    <div className="text-[11px] opacity-75 mt-1 truncate">
                      Weak area: {student.weakestSubject || 'N/A'}{typeof student.weakestScore === 'number' ? ` (${student.weakestScore}%)` : ''}
                    </div>
                    {Array.isArray(student.testsAttended) && student.testsAttended.length > 0 && (
                      <div className="text-[11px] opacity-75 truncate">Recent: {student.testsAttended.join(', ')}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Student Performance Details */}
        <div className="lg:col-span-2">
          {!selectedStudent ? (
            <div className="card p-8 text-center">
              <p className="text-slate-500">Select a student to view their performance</p>
            </div>
          ) : loading ? (
            <div className="card p-8 text-center">
              <p className="text-slate-500">Loading student data...</p>
            </div>
          ) : error ? (
            <div className="card p-8 text-center">
              <p className="text-red-700">{error}</p>
            </div>
          ) : studentData ? (
            <div className="space-y-4">
              {/* Student Header */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold text-slate-900">{studentData.student.name}</h2>
                <p className="text-sm text-slate-500">{studentData.student.email}</p>
                <p className="text-xs text-slate-400 mt-1">Since {new Date(studentData.student.created_at).toLocaleDateString()}</p>
              </div>

              {/* Cognitive Profile */}
              <CognitiveProfile studentData={studentData} />

              {/* Login Activity Box */}
              <div className="card p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Login Activity</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <div className="text-xl font-bold text-indigo-700">{studentData.summary.weeklyLogins || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Weekly Logins</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <div className="text-xl font-bold text-teal-700">{formatDuration(studentData.summary.todayEngagementSeconds ?? studentData.summary.todayActiveSeconds)}</div>
                    <div className="text-xs text-slate-500 mt-1">Time Spent Today</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <div className="text-xl font-bold text-fuchsia-700">{formatDuration(studentData.summary.weeklyEngagementSeconds ?? studentData.summary.weeklyActiveSeconds)}</div>
                    <div className="text-xs text-slate-500 mt-1">Time Spent This Week</div>
                  </div>
                </div>
              </div>

              {/* Topic-wise Performance - collapsible */}
              <div className="card border border-slate-200 overflow-hidden">
                <button onClick={() => toggleSection('topic')} className="w-full px-4 py-3 text-left flex items-center justify-between bg-white hover:bg-slate-50">
                  <span className="text-sm font-semibold text-sky-700">Topic-wise Performance</span>
                  <span className="text-sm text-slate-500">{expandedSection === 'topic' ? '\u2212' : '+'}</span>
                </button>
                {expandedSection === 'topic' && (
                  <div className="px-4 pb-4">
                    {(studentData.subjectScores || []).length === 0 ? (
                      <p className="text-sm text-slate-500">No topic data</p>
                    ) : (
                      <div className="space-y-2">
                        {(studentData.subjectScores || []).map((subject, idx) => (
                          <div key={`topic-${idx}`} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{subject.subject}</div>
                              <div className="text-xs text-slate-500">{subject.attempts} attempt(s)</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-28 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${subject.avgScore}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-sky-700 w-12 text-right">{subject.avgScore}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                <div className="card p-4 text-center border border-slate-200/80">
                  <div className="text-2xl font-bold text-sky-700">{studentData.summary.totalTests}</div>
                  <div className="text-xs text-slate-500 mt-1">Total Tests</div>
                </div>
                <div className="card p-4 text-center border border-slate-200/80">
                  <div className="text-2xl font-bold text-emerald-700">{studentData.summary.avgScorePercentage}%</div>
                  <div className="text-xs text-slate-500 mt-1">Avg Score</div>
                </div>
                <div className="card p-4 text-center border border-slate-200/80">
                  <div className="text-2xl font-bold text-violet-700">{studentData.summary.totalScore}</div>
                  <div className="text-xs text-slate-500 mt-1">Total Score</div>
                </div>
                <div className="card p-4 text-center border border-slate-200/80">
                  <div className="text-2xl font-bold text-amber-700">{studentData.summary.totalQuestions}</div>
                  <div className="text-xs text-slate-500 mt-1">Total Q's</div>
                </div>
                <div className="card p-4 text-center border border-slate-200/80">
                  <div className="text-2xl font-bold text-indigo-700">{studentData.summary.weeklyLogins || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Weekly Logins</div>
                </div>
                <div className="card p-4 text-center border border-slate-200/80">
                  <div className="text-2xl font-bold text-teal-700">{formatDuration(studentData.summary.todayEngagementSeconds ?? studentData.summary.todayActiveSeconds)}</div>
                  <div className="text-xs text-slate-500 mt-1">Time Spent Today</div>
                </div>
                <div className="card p-4 text-center border border-slate-200/80">
                  <div className="text-2xl font-bold text-fuchsia-700">{formatDuration(studentData.summary.weeklyEngagementSeconds ?? studentData.summary.weeklyActiveSeconds)}</div>
                  <div className="text-xs text-slate-500 mt-1">Time Spent This Week</div>
                </div>
              </div>

              {/* Expandable Sections */}
              <div className="space-y-3">
                <div className="card border border-slate-200 overflow-hidden">
                  <button onClick={() => toggleSection('weakest')} className="w-full px-5 py-4 text-left flex items-center justify-between bg-white hover:bg-slate-50">
                    <span className="text-base font-semibold text-red-700">Weakest Subjects</span>
                    <span className="text-sm text-slate-500">{expandedSection === 'weakest' ? '−' : '+'}</span>
                  </button>
                  {expandedSection === 'weakest' && (
                    <div className="px-5 pb-5">
                      {studentData.weakestSubjects.length === 0 ? (
                        <p className="text-sm text-slate-500">No test data</p>
                      ) : (
                        <div className="space-y-2">
                          {studentData.weakestSubjects.map((subject, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="text-sm text-slate-700">{subject.subject}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${subject.avgScore}%` }} />
                                </div>
                                <span className="text-sm font-semibold text-red-700 w-12 text-right">{subject.avgScore}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="card border border-slate-200 overflow-hidden">
                  <button onClick={() => toggleSection('strongest')} className="w-full px-5 py-4 text-left flex items-center justify-between bg-white hover:bg-slate-50">
                    <span className="text-base font-semibold text-emerald-700">Strongest Subjects</span>
                    <span className="text-sm text-slate-500">{expandedSection === 'strongest' ? '−' : '+'}</span>
                  </button>
                  {expandedSection === 'strongest' && (
                    <div className="px-5 pb-5">
                      {studentData.strongestSubjects.length === 0 ? (
                        <p className="text-sm text-slate-500">No test data</p>
                      ) : (
                        <div className="space-y-2">
                          {studentData.strongestSubjects.map((subject, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="text-sm text-slate-700">{subject.subject}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${subject.avgScore}%` }} />
                                </div>
                                <span className="text-sm font-semibold text-emerald-700 w-12 text-right">{subject.avgScore}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="card border border-slate-200 overflow-hidden">
                  <button onClick={() => toggleSection('company')} className="w-full px-5 py-4 text-left flex items-center justify-between bg-white hover:bg-slate-50">
                    <span className="text-base font-semibold text-slate-900">Performance by Company</span>
                    <span className="text-sm text-slate-500">{expandedSection === 'company' ? '−' : '+'}</span>
                  </button>
                  {expandedSection === 'company' && (
                    <div className="px-5 pb-5">
                      {studentData.companyPerformance.length === 0 ? (
                        <p className="text-sm text-slate-500">No company performance data</p>
                      ) : (
                        <div className="space-y-2">
                          {studentData.companyPerformance.map((company, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                              <div>
                                <div className="text-sm font-semibold text-slate-800">{company.company}</div>
                                <div className="text-xs text-slate-500">{company.tests} test(s)</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${company.avgScore}%` }} />
                                </div>
                                <span className="text-sm font-semibold text-indigo-700 w-12 text-right">{company.avgScore}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="card border border-slate-200 overflow-hidden">
                  <button onClick={() => toggleSection('tests')} className="w-full px-5 py-4 text-left flex items-center justify-between bg-white hover:bg-slate-50">
                    <span className="text-base font-semibold text-slate-900">All Test Results</span>
                    <span className="text-sm text-slate-500">{expandedSection === 'tests' ? '−' : '+'}</span>
                  </button>
                  {expandedSection === 'tests' && (
                    <div className="px-5 pb-5">
                      {studentData.testResults.length === 0 ? (
                        <p className="text-sm text-slate-500">No test results</p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {studentData.testResults.map((test, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                              <div>
                                <div className="text-sm font-semibold text-slate-800">{test.test_title}</div>
                                <div className="text-xs text-slate-500">
                                  {test.company && `${test.company}`} {test.role && `- ${test.role}`}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {new Date(test.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-indigo-700">
                                  {test.score}/{test.total_questions}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {Math.round((test.score / test.total_questions) * 100)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-slate-500">No performance metrics available for this student yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
