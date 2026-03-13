import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

export default function CompanyDNA() {
  const { company } = useParams()
  const nav = useNavigate()
  const [dna, setDna] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDNA = async () => {
      try {
        setLoading(true)
        const { data } = await api.get(`/company-dna/${encodeURIComponent(company)}`)
        setDna(data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch company DNA', err)
        setError('Failed to load company data')
        setDna(null)
      } finally {
        setLoading(false)
      }
    }

    if (company) fetchDNA()
  }, [company])

  if (loading) return <div className="text-center py-8 text-slate-700">Loading company data...</div>
  if (error) return <div className="text-red-700 text-center py-8">{error}</div>
  if (!dna) return <div className="text-slate-600 text-center py-8">No data found</div>

  return (
    <div className="app-container space-y-6">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => nav(-1)} className="btn-ghost px-3 py-2 mb-4">← Back</button>
        <h1 className="page-title mb-2">{dna.company} Company DNA</h1>
        <p className="page-subtitle">Understand the company, tech stack, and recent interview patterns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tech Stack */}
          <div className="card p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">⚙️ Most Common Tech Stack</h2>
            {dna.techStack && dna.techStack.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {dna.techStack.map((tech, idx) => (
                  <span key={idx} className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-sm font-medium text-indigo-700">
                    {tech}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">No tech stack data available</p>
            )}
          </div>

          {/* Recent Interviews */}
          <div className="card p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">📋 Recent Interviews ({dna.recentInterviews?.length || 0})</h2>
            {dna.recentInterviews && dna.recentInterviews.length > 0 ? (
              <div className="space-y-3">
                {dna.recentInterviews.map((interview, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-200 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{interview.role}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          📍 {interview.round || 'Technical Round'} • 
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            interview.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                            interview.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {interview.difficulty}
                          </span>
                        </div>
                        {interview.description && (
                          <p className="text-sm text-slate-600 mt-2">{interview.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">
                          {new Date(interview.date).toLocaleDateString()}
                        </div>
                        {interview.linkedin && (
                          <a href={interview.linkedin} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:text-indigo-800 text-xs mt-2 block">
                            👤 LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">No interview data available</p>
            )}
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Quick Links */}
          <div className="card p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">🔗 Quick Links</h2>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-slate-600 text-sm">Practice Problems</div>
                <div className="text-2xl font-bold text-indigo-700">{dna.quickLinks?.problemsCount || 0}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-slate-600 text-sm">Mock Interviews</div>
                <div className="text-2xl font-bold text-emerald-700">{dna.quickLinks?.mockTestsCount || 0}</div>
              </div>
              <button 
                onClick={() => nav(`/search?company=${encodeURIComponent(dna.company)}`)}
                className="w-full btn-primary px-4 py-2 font-medium"
              >
                → Search for Problems
              </button>
            </div>
          </div>

          {/* Roles Available */}
          <div className="card p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">👔 Roles Available</h2>
            {dna.quickLinks?.rolesAvailable && dna.quickLinks.rolesAvailable.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {dna.quickLinks.rolesAvailable.map((role, idx) => (
                  <button
                    key={idx}
                    onClick={() => nav(`/search?company=${encodeURIComponent(dna.company)}&role=${encodeURIComponent(role)}`)}
                    className="px-3 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-sm text-slate-700 rounded-lg transition"
                  >
                    {role}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">No roles data available</p>
            )}
          </div>

          {/* Statistics */}
          <div className="card p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">📊 Statistics</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Interviews Logged:</span>
                <span className="font-semibold text-slate-900">{dna.stats?.totalInterviewsLogged || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Data Points Collected:</span>
                <span className="font-semibold text-slate-900">{dna.recentInterviews?.length || 0}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Call to Action */}
      <div className="card border border-indigo-100 p-6 rounded-lg text-center">
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Ready to Ace Your Interview?</h3>
        <p className="text-slate-600 mb-4">Start practicing with {dna.company}'s actual interview questions and patterns.</p>
        <button 
          onClick={() => nav(`/search?company=${encodeURIComponent(dna.company)}`)}
          className="btn-primary px-6 py-2 font-semibold"
        >
          Start Practicing Now
        </button>
      </div>

    </div>
  )
}
