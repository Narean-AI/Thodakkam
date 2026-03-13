import React, { useState, useEffect } from 'react'
import api from '../../api'

export default function ManageStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [studentDetails, setStudentDetails] = useState({}) // Store performance data
  const [expandedStudent, setExpandedStudent] = useState(null) // Track which student is expanded

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [formError, setFormError] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  useEffect(() => {
    fetchStudents()
  }, [page, searchTerm])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/admin/student-list', {
        params: { page, limit, q: searchTerm }
      })
      setStudents(res.data.students || [])
      setTotal(res.data.total || 0)
      
      // Fetch performance data for each student
      if (res.data.students && res.data.students.length > 0) {
        const details = {}
        for (const student of res.data.students) {
          try {
            const perfRes = await api.get(`/admin/analytics/students/${student.id}`)
            details[student.id] = perfRes.data
          } catch (e) {
            details[student.id] = null
          }
        }
        setStudentDetails(details)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load students')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setFormError('All fields are required')
      return
    }

    try {
      setFormLoading(true)
      setFormError(null)
      const res = await api.post('/admin/students', formData)
      
      // Reset form
      setFormData({ name: '', email: '', password: '' })
      setShowAddForm(false)
      
      // Refresh list
      fetchStudents()
      
      // Show success message
      alert(`Student "${res.data.student.name}" added successfully!`)
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to add student')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!deleteConfirm) return

    try {
      setDeleting(deleteConfirm.id)
      await api.delete(`/admin/students/${deleteConfirm.id}`)
      
      // Refresh list
      fetchStudents()
      setDeleteConfirm(null)
      alert(`Student "${deleteConfirm.name}" deleted successfully!`)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete student')
    } finally {
      setDeleting(null)
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="app-container max-w-6xl">
      <h2 className="page-title mb-6">Manage Students</h2>

      {/* Add Student Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={showAddForm ? 'btn-ghost' : 'btn-primary'}
        >
          {showAddForm ? '✕ Cancel' : '+ Add New Student'}
        </button>
      </div>

      {/* Add Student Form */}
      {showAddForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Add New Student</h3>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter student name"
                className="field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter student email"
                className="field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Set initial password"
                className="field"
              />
            </div>
            {formError && (
              <div className="text-red-700 text-sm bg-red-50 border border-red-200 p-2 rounded">{formError}</div>
            )}
            <button
              type="submit"
              disabled={formLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {formLoading ? 'Adding...' : 'Add Student'}
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="card p-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setPage(1)
          }}
          className="field"
        />
      </div>

      {/* Status Messages */}
      {loading && <div className="text-center text-slate-500 mb-4">Loading students...</div>}
      {error && <div className="text-center text-red-700 mb-4">{error}</div>}

      {/* Students List */}
      {!loading && filteredStudents.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-400">{students.length === 0 ? 'No students found' : 'No matching students'}</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-indigo-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Tests</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Avg Accuracy</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Avg Speed</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const perfData = studentDetails[student.id]
                  const isExpanded = expandedStudent === student.id
                  
                  return (
                    <React.Fragment key={student.id}>
                      <tr className={`cursor-pointer border-b border-slate-100 hover:bg-indigo-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`} onClick={() => setExpandedStudent(isExpanded ? null : student.id)}>
                        <td className="px-6 py-4 text-sm font-semibold text-indigo-700">
                          {isExpanded ? '▼' : '▶'} {student.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600">
                          {perfData?.summary?.totalTests || 0}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {perfData?.summary?.avgScorePercentage ? (
                            <span className={
                              perfData.summary.avgScorePercentage >= 75 ? 'text-emerald-700 font-semibold' :
                              perfData.summary.avgScorePercentage >= 50 ? 'text-amber-700 font-semibold' :
                              'text-red-700 font-semibold'
                            }>
                              {perfData.summary.avgScorePercentage}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600">
                          {perfData?.summary?.avgSecondsPerQuestion ? (
                            `${Math.round(perfData.summary.avgSecondsPerQuestion)}s`
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm(student)
                            }}
                            disabled={deleting === student.id}
                            className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs rounded hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            {deleting === student.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Details Row */}
                      {isExpanded && perfData && (
                        <tr className="bg-indigo-50">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="space-y-4">
                              {/* Summary Cards */}
                              <div className="grid grid-cols-4 gap-4">
                                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                                  <p className="text-xs text-slate-500 mb-1">Total Tests</p>
                                  <p className="text-2xl font-bold text-indigo-700">{perfData.summary?.totalTests || 0}</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                                  <p className="text-xs text-slate-500 mb-1">Total Attempts</p>
                                  <p className="text-2xl font-bold text-violet-700">{perfData.summary?.totalAttempts || 0}</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                                  <p className="text-xs text-slate-500 mb-1">Avg Accuracy</p>
                                  <p className={`text-2xl font-bold ${
                                    perfData.summary?.avgScorePercentage >= 75 ? 'text-emerald-700' :
                                    perfData.summary?.avgScorePercentage >= 50 ? 'text-amber-700' :
                                    'text-red-700'
                                  }`}>
                                    {perfData.summary?.avgScorePercentage || 0}%
                                  </p>
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                                  <p className="text-xs text-slate-500 mb-1">Avg Speed</p>
                                  <p className="text-2xl font-bold text-sky-700">
                                    {perfData.summary?.avgSecondsPerQuestion ? `${Math.round(perfData.summary.avgSecondsPerQuestion)}s` : '-'}
                                  </p>
                                </div>
                              </div>

                              {/* Weakest and Strongest Subjects */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                  <h4 className="text-sm font-semibold text-red-700 mb-2">⬇️ Weakest Subjects</h4>
                                  {perfData.weakestSubjects && perfData.weakestSubjects.length > 0 ? (
                                    <ul className="text-xs space-y-1">
                                      {perfData.weakestSubjects.slice(0, 3).map((s, i) => (
                                        <li key={i} className="text-slate-700">
                                          • <strong>{s.subject}</strong> - {s.avgScore}% ({s.attempts} attempts)
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-slate-500">No test data</p>
                                  )}
                                </div>

                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                  <h4 className="text-sm font-semibold text-emerald-700 mb-2">⬆️ Strongest Subjects</h4>
                                  {perfData.strongestSubjects && perfData.strongestSubjects.length > 0 ? (
                                    <ul className="text-xs space-y-1">
                                      {perfData.strongestSubjects.slice(0, 3).map((s, i) => (
                                        <li key={i} className="text-slate-700">
                                          • <strong>{s.subject}</strong> - {s.avgScore}% ({s.attempts} attempts)
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-slate-500">No test data</p>
                                  )}
                                </div>
                              </div>

                              {/* Subject Scores Table */}
                              {perfData.subjectScores && perfData.subjectScores.length > 0 && (
                                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                                  <h4 className="text-sm font-semibold text-slate-900 mb-3">📊 Subject Performance</h4>
                                  <div className="max-h-32 overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200">
                                          <th className="text-left py-1 px-2 text-slate-600">Subject</th>
                                          <th className="text-center py-1 px-2 text-slate-600">Score</th>
                                          <th className="text-center py-1 px-2 text-slate-600">Accuracy</th>
                                          <th className="text-center py-1 px-2 text-slate-600">Attempts</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {perfData.subjectScores.map((sc, i) => (
                                          <tr key={i} className="border-b border-slate-100">
                                            <td className="py-1 px-2 font-semibold text-indigo-700">{sc.subject}</td>
                                            <td className="text-center py-1 px-2 text-slate-600">{sc.avgScore}%</td>
                                            <td className="text-center py-1 px-2 text-slate-500">{Math.round((sc.totalScore / (sc.totalQuestions || 1)) * 100)}%</td>
                                            <td className="text-center py-1 px-2 text-slate-500">{sc.attempts}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-ghost disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-slate-500 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-ghost disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Student?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email})? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 btn-ghost disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition"
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
