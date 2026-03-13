
import React, { useState } from 'react'
import { getTokenPayload } from '../../utils/auth'
import StudentPerformance from './StudentPerformance'
import ManageStudents from './ManageStudents'

export default function AdminPanel(){
  const payload = getTokenPayload()
  const role = payload?.role || 'student'
  const [activeTab, setActiveTab] = useState('overview')

  if (role !== 'admin' && role !== 'super_admin') {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Admin Panel</h2>
        <div className="text-slate-500">You don't have access to the admin panel.</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="page-title mb-6">Admin Dashboard</h2>

      {/* Tab Navigation */}
      <div className="card mb-6 p-4">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={activeTab === 'overview' ? 'btn-primary whitespace-nowrap' : 'btn-ghost whitespace-nowrap'}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('student-performance')}
            className={activeTab === 'student-performance' ? 'btn-primary whitespace-nowrap' : 'btn-ghost whitespace-nowrap'}
          >
            📊 Student Performance
          </button>
          <button
            onClick={() => setActiveTab('manage-students')}
            className={activeTab === 'manage-students' ? 'btn-primary whitespace-nowrap' : 'btn-ghost whitespace-nowrap'}
          >
            👥 Manage Students
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={activeTab === 'content' ? 'btn-primary whitespace-nowrap' : 'btn-ghost whitespace-nowrap'}
          >
            📚 Content Management
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Welcome to Admin Dashboard</h3>
          <p className="text-slate-500 mb-6">
            As an admin, you can manage student performance, company content, experiences, and mock tests.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 border border-indigo-200 border-l-4 border-l-indigo-500 p-4 rounded-xl cursor-pointer hover:bg-indigo-100 transition" onClick={() => setActiveTab('student-performance')}>
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold text-indigo-900">Student Performance</div>
              <div className="text-sm text-slate-600">View test scores and analytics</div>
            </div>
            <div className="bg-sky-50 border border-sky-200 border-l-4 border-l-sky-500 p-4 rounded-xl cursor-pointer hover:bg-sky-100 transition" onClick={() => setActiveTab('manage-students')}>
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold text-sky-900">Manage Students</div>
              <div className="text-sm text-slate-600">Add, update, or delete students</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 border-l-4 border-l-rose-500 p-4 rounded-xl cursor-pointer hover:bg-rose-100 transition" onClick={() => setActiveTab('content')}>
              <div className="text-2xl mb-2">📚</div>
              <div className="font-semibold text-rose-900">Content Management</div>
              <div className="text-sm text-slate-600">Manage experiences and tests</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'student-performance' && (
        <StudentPerformance />
      )}

      {activeTab === 'manage-students' && (
        <ManageStudents />
      )}

      {activeTab === 'content' && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Content Management</h3>
          <p className="text-slate-500">Content management features coming soon...</p>
        </div>
      )}
    </div>
  )
}
