import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CircularProgress from '../components/CircularProgress'
import QuickActions from '../components/QuickActions'
import Scoreboard from '../components/Scoreboard'
import api from '../api'
import getTokenPayload from '../utils/auth'

export default function Dashboard(){
  const nav = useNavigate()
  const [role, setRole] = useState('student')
  const [readiness, setReadiness] = useState(0)
  const [weakTopics, setWeakTopics] = useState([])
  const [companies, setCompanies] = useState([])
  const [studentProgressRate, setStudentProgressRate] = useState(0)
  const [superSummary, setSuperSummary] = useState({
    students: 0,
    admins: 0,
    superAdmins: 0,
    studentPct: 0,
    adminPct: 0
  })

  useEffect(()=>{
    let mounted = true

    const payload = getTokenPayload()
    const userRole = payload?.role || 'student'
    setRole(userRole)

    const fetchScoreboard = async ()=>{
      try{
        const { data } = await api.get('/scoreboard')
        if (!mounted) return
        
        if (data.scoreboard && data.scoreboard.length > 0) {
          // Calculate average readiness percentage
          let totalScore = 0
          let totalQuestions = 0
          const topicScores = {}

          data.scoreboard.forEach(test => {
            test.attempts.forEach(att => {
              totalScore += att.score
              totalQuestions += att.total
              const percentage = Math.round((att.score / att.total) * 100)
              
              if (!topicScores[test.title]) {
                topicScores[test.title] = []
              }
              topicScores[test.title].push(percentage)
            })
          })

          // Overall readiness
          const overallReadiness = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0
          setReadiness(overallReadiness)

          // Get weak topics (lowest average score)
          const topicAverages = Object.entries(topicScores).map(([title, scores]) => ({
            title,
            avg: Math.round(scores.reduce((a, b) => a + b) / scores.length)
          }))
          
          const weak = topicAverages
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 2)
            .map(t => t.title.split(' - ')[1] || t.title)

          setWeakTopics(weak)
        }
      }catch(err){
        console.error('Failed to fetch scoreboard', err)
      }
    }

    const fetchAdminStudentProgress = async () => {
      try {
        const { data } = await api.get('/admin/analytics/students/overview')
        if (!mounted) return

        const students = data?.students || []
        if (students.length === 0) {
          setStudentProgressRate(0)
          return
        }

        const totalAvg = students.reduce((sum, student) => sum + (student.avgScore || 0), 0)
        setStudentProgressRate(Math.round(totalAvg / students.length))
      } catch (err) {
        console.error('Failed to fetch student overview', err)
      }
    }

    const fetchSuperAdminSummary = async () => {
      try {
        const { data } = await api.get('/admin/users?limit=1000&page=1')
        if (!mounted) return

        const users = data?.users || []
        const students = users.filter(user => user.role === 'student').length
        const admins = users.filter(user => user.role === 'admin').length
        const superAdmins = users.filter(user => user.role === 'super_admin').length
        const base = students + admins

        setSuperSummary({
          students,
          admins,
          superAdmins,
          studentPct: base > 0 ? Math.round((students / base) * 100) : 0,
          adminPct: base > 0 ? Math.round((admins / base) * 100) : 0
        })
      } catch (err) {
        console.error('Failed to fetch super admin summary', err)
      }
    }
    
    const fetchCompanies = async ()=>{
      try{
        const { data } = await api.get('/meta/companies')
        if (!mounted) return
        setCompanies(data.companies || [])
      }catch(err){
        console.error('Failed to fetch companies', err)
      }
    }
    
    if (userRole === 'student') {
      fetchScoreboard()
    } else if (userRole === 'admin') {
      fetchAdminStudentProgress()
    } else if (userRole === 'super_admin') {
      fetchSuperAdminSummary()
    }

    fetchCompanies()
    return ()=>{ mounted = false }
  }, [])

  return (
    <div className="app-container">
      <section className="card p-6 md:p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle mt-1">Track readiness, discover opportunities, and take next actions quickly.</p>
          </div>
          <QuickActions />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {role === 'student' && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Current readiness</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{readiness}%</div>
                <div className="text-sm text-slate-600 mt-1">Based on your latest mock performance.</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Weak topics</div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {weakTopics.length > 0 ? (
                    weakTopics.map((topic, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">{topic}</span>
                    ))
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">No tests yet</span>
                  )}
                </div>
                <div className="text-sm text-slate-600 mt-3">Prioritize these in your roadmap sessions.</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-center">
                <CircularProgress value={readiness} />
              </div>
            </>
          )}

          {role === 'admin' && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">Student progress rate</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{studentProgressRate}%</div>
                <div className="text-sm text-slate-600 mt-1">Average progress across all students based on their mock test scores.</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-center">
                <CircularProgress value={studentProgressRate} />
              </div>
            </>
          )}

          {role === 'super_admin' && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Students</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{superSummary.studentPct}%</div>
                <div className="text-sm text-slate-600 mt-1">{superSummary.students} of {superSummary.students + superSummary.admins} managed users</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Admins</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{superSummary.adminPct}%</div>
                <div className="text-sm text-slate-600 mt-1">{superSummary.admins} of {superSummary.students + superSummary.admins} managed users</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Role distribution chart</div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-600">Students ({superSummary.studentPct}%)</div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${superSummary.studentPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-600">Admins ({superSummary.adminPct}%)</div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${superSummary.adminPct}%` }} />
                    </div>
                  </div>
                  <div className="pt-1 text-xs text-slate-500">Super Admin count: {superSummary.superAdmins}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Explore Companies</h3>
          <button onClick={() => nav('/search')} className="btn-secondary px-3 py-2 text-sm">Open Search</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {companies.length > 0 ? (
            companies.slice(0, 3).map((comp, idx) => (
              <button
                key={idx}
                onClick={() => nav(`/company/${encodeURIComponent(comp.name)}`)}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition text-left"
              >
                <div className="font-semibold text-slate-900">{comp.name}</div>
                <div className="text-xs text-slate-600 mt-2">Company DNA, interview themes, and stack insights.</div>
              </button>
            ))
          ) : (
            <>
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-800">Company DNA<div className="text-xs text-slate-600 mt-2">Most common stack: React, Node, SQL.</div></div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-800">Quick Links<div className="text-xs text-slate-600 mt-2">Practice problems and mock interviews.</div></div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-800">Recent Interviews<div className="text-xs text-slate-600 mt-2">New data appears after logs are added.</div></div>
            </>
          )}
        </div>
      </section>

      <Scoreboard />
    </div>
  )
}