import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Splash(){
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login', { replace: true })
    }, 5000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-full flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="card p-10 sm:p-14 text-center">
          <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-[0_18px_45px_rgba(79,70,229,0.35)] flex items-center justify-center text-white text-4xl font-black tracking-tight">
            T
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none">
            <span className="bg-gradient-to-r from-indigo-700 to-sky-600 bg-clip-text text-transparent">Thodakkam</span>
          </h1>

          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            Placement readiness starts here.
          </p>

          <p className="mt-8 text-sm text-slate-500">
            Redirecting to login...
          </p>
        </div>
      </div>
    </div>
  )
}
