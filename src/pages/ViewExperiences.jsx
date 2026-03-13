import React, { useState, useEffect } from 'react'
import api from '../api'
import { getTokenPayload } from '../utils/auth'

export default function ViewExperiences() {
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterCompany, setFilterCompany] = useState('')
  const [filteredExp, setFilteredExp] = useState([])
  const [deleting, setDeleting] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  
  const userPayload = getTokenPayload()
  const canDelete = userPayload?.role === 'admin' || userPayload?.role === 'super_admin'

  useEffect(() => {
    fetchExperiences()
  }, [])

  useEffect(() => {
    const filtered = filterCompany
      ? experiences.filter(e => e.company.toLowerCase().includes(filterCompany.toLowerCase()))
      : experiences
    setFilteredExp(filtered)
  }, [filterCompany, experiences])

  const fetchExperiences = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/experiences')
      setExperiences(res.data.results || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load experiences')
      setExperiences([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExperience = async () => {
    if (!deleteConfirm) return
    
    try {
      setDeleting(deleteConfirm.id)
      setDeleteError(null)
      await api.delete(`/experience/${deleteConfirm.id}`)
      setExperiences(experiences.filter(exp => exp.id !== deleteConfirm.id))
      setDeleteConfirm(null)
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Failed to delete experience')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="app-container max-w-6xl">
      <h2 className="page-title mb-4">User Experiences</h2>

      {/* Filter */}
      <div className="card p-4 mb-4">
        <input
          type="text"
          placeholder="Filter by company..."
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="field"
        />
      </div>

      {/* Status Messages */}
      {loading && <div className="text-center text-indigo-700">Loading experiences...</div>}
      {error && <div className="text-center text-red-700">{error}</div>}

      {/* Experiences List */}
      {!loading && filteredExp.length === 0 && (
        <div className="text-center text-slate-600">
          {experiences.length === 0 ? 'No experiences uploaded yet.' : 'No matching experiences found.'}
        </div>
      )}

      {!loading && filteredExp.length > 0 && (
        <div className="flex flex-col gap-4">
          {filteredExp.map((exp) => (
            <div key={exp.id} className="card p-4 border-l-4 border-indigo-500">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{exp.role}</h3>
                  <p className="text-sm text-slate-600">{exp.company}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700">
                    {exp.round || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Difficulty Badge */}
              {exp.difficulty && (
                <div className="mb-2">
                  <span
                    className={`text-xs px-2 py-1 rounded font-semibold ${
                      exp.difficulty === 'Hard'
                        ? 'bg-red-100 text-red-700'
                        : exp.difficulty === 'Medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {exp.difficulty}
                  </span>
                </div>
              )}

              {/* Description */}
              {exp.description && (
                <div className="mb-3">
                  <p className="text-sm text-slate-300 mb-1"><strong>Summary:</strong></p>
                  <p className="text-sm text-slate-600">{exp.description}</p>
                </div>
              )}

              {/* Questions */}
              {exp.questions && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Questions:</p>
                  <pre className="text-xs bg-white border border-slate-200 p-2 rounded text-slate-700 overflow-x-auto max-h-40">
                    {exp.questions}
                  </pre>
                </div>
              )}

              {/* Preparation Tips */}
              {exp.preparation_tips && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Preparation Tips:</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{exp.preparation_tips}</p>
                </div>
              )}

              {/* Resources */}
              {exp.resources && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Resources:</p>
                  <div className="text-xs text-slate-600 space-y-1">
                    {exp.resources.split('\n').map((resource, i) => (
                      resource.trim() && (
                        <div key={i}>
                          {resource.includes('http') ? (
                            <a href={resource.trim()} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:text-indigo-800 underline">
                              {resource.trim()}
                            </a>
                          ) : (
                            <span>{resource.trim()}</span>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {exp.tags && (
                <div className="mb-3">
                  <div className="flex gap-2 flex-wrap">
                    {exp.tags.split(',').map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference Link */}
              {exp.reference_link && (
                <div className="mb-3">
                  <a
                    href={exp.reference_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-700 hover:text-indigo-800 underline"
                  >
                    📖 Reference Link
                  </a>
                </div>
              )}

              {/* Profiles */}
              <div className="flex gap-4 text-xs">
                {exp.github && (
                  <a
                    href={exp.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-700 hover:text-indigo-800 underline"
                  >
                    GitHub
                  </a>
                )}
                {exp.linkedin && (
                  <a
                    href={exp.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-700 hover:text-indigo-800 underline"
                  >
                    LinkedIn
                  </a>
                )}
              </div>

              {/* Delete Button (Admin/Super Admin Only) */}
              {canDelete && (
                <div className="mt-3">
                  <button
                    onClick={() => setDeleteConfirm(exp)}
                    className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              )}

              {/* Date */}
              <div className="text-xs text-slate-500 mt-2">
                {new Date(exp.created_at).toLocaleDateString()} {new Date(exp.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-sm">
            <h3 className="text-lg font-bold mb-2">Delete Experience?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete the experience at <strong>{deleteConfirm.company}</strong>? This action cannot be undone.
            </p>
            {deleteError && (
              <div className="text-sm text-red-700 mb-4">{deleteError}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExperience}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting === deleteConfirm.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
