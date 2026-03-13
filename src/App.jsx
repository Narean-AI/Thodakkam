import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import api from './api'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Splash from './pages/Splash'
import SemanticSearch from './pages/SemanticSearch'
import CognitiveProfile from './pages/CognitiveProfile'
import TrendAnalytics from './pages/TrendAnalytics'
import ExperienceUpload from './pages/ExperienceUpload'
import ViewExperiences from './pages/ViewExperiences'
import ProblemDetail from './pages/ProblemDetail'
import CompanyDNA from './pages/CompanyDNA'
import ScoreboardPage from './pages/Scoreboard'
import SuperAdminPanel from './pages/panels/SuperAdminPanel'
import AdminPanel from './pages/panels/AdminPanel'
import StudentPanel from './pages/panels/StudentPanel'
import PersonalizedRoadmap from './pages/panels/PersonalizedRoadmap'

import getTokenPayload from './utils/auth'

function RequireAuth({ children }){
  const payload = getTokenPayload()
  if (!payload) return <Navigate to="/login" replace />
  return children
}

function RoleGuard({ allowed = [], children }){
  try{
    const payload = getTokenPayload()
    if (!payload) return <Navigate to="/login" replace />
    if (!allowed.includes(payload.role)) return <Navigate to="/dashboard" replace />
    return children
  }catch(e){
    return <Navigate to="/login" replace />
  }
}

export default function App(){
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/'

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload || isAuthRoute) return

    const sendPing = (seconds = 60) => {
      if (document.hidden) return
      api.post('/activity/ping', { seconds }).catch(() => {})
    }

    sendPing(15)
    const interval = setInterval(() => sendPing(60), 60000)
    return () => clearInterval(interval)
  }, [isAuthRoute, location.pathname])

  return (
    <div className="app-shell">
      {!isAuthRoute && <Navbar />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/search" element={<RequireAuth><SemanticSearch /></RequireAuth>} />
          <Route path="/problem/:id" element={<RequireAuth><ProblemDetail /></RequireAuth>} />
          <Route path="/company/:company" element={<RequireAuth><CompanyDNA /></RequireAuth>} />
          <Route path="/cognitive/:userId" element={<RequireAuth><CognitiveProfile /></RequireAuth>} />
          <Route path="/learn" element={<RequireAuth><TrendAnalytics /></RequireAuth>} />
          <Route path="/trends" element={<RequireAuth><TrendAnalytics /></RequireAuth>} />
          <Route path="/scoreboard" element={<RequireAuth><ScoreboardPage /></RequireAuth>} />
          <Route path="/upload" element={<RequireAuth><ExperienceUpload /></RequireAuth>} />
          <Route path="/experiences" element={<RequireAuth><ViewExperiences /></RequireAuth>} />
          <Route path="/panel/super" element={<RequireAuth><RoleGuard allowed={["super_admin"]}><SuperAdminPanel /></RoleGuard></RequireAuth>} />
          <Route path="/panel/admin" element={<RequireAuth><RoleGuard allowed={["admin","super_admin"]}><AdminPanel /></RoleGuard></RequireAuth>} />
          <Route path="/panel/roadmap" element={<RequireAuth><RoleGuard allowed={["student"]}><PersonalizedRoadmap /></RoleGuard></RequireAuth>} />
          <Route path="/panel/student" element={<RequireAuth><RoleGuard allowed={["student","admin","super_admin"]}><StudentPanel /></RoleGuard></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}