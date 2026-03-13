import React, { useEffect, useState, useRef } from 'react'
import api from '../api'

export default function MockTestRunner({ mockTest, onClose }){
  const questions = mockTest.questions || []
  const defaultMinutes = 15
  const perQuestionSeconds = Math.max(60, Math.ceil((defaultMinutes * 60) / Math.max(1, questions.length)))
  const INACTIVITY_TIMEOUT = 60000 // 60 seconds in milliseconds

  const [running, setRunning] = useState(false)
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(perQuestionSeconds)
  const [completed, setCompleted] = useState(false)
  const [shuffledQuestions, setShuffledQuestions] = useState(questions)
  const [answers, setAnswers] = useState(() => shuffledQuestions.map(() => null))
  const [score, setScore] = useState(null)
  const [violation, setViolation] = useState(null)
  const [attempts, setAttempts] = useState(1)
  const timerRef = useRef(null)
  const inactivityTimerRef = useRef(null)
  const wasFullscreenRef = useRef(false)
  const startTimeRef = useRef(null)

  // Helper function: Reset test after violation
  const resetTestAfterViolation = (violationMessage) => {
    alert('You left the test screen. Test restarting.')
    setViolation(violationMessage)
    setRunning(false)
    setIndex(0)
    setSecondsLeft(perQuestionSeconds)
    // Count this as a retry/attempt
    setAttempts(a => a + 1)
    const reshuffled = [...shuffledQuestions].sort(() => Math.random() - 0.5)
    setShuffledQuestions(reshuffled)
    setAnswers(reshuffled.map(() => null))
    // reset test timer
    startTimeRef.current = Date.now()
    setTimeout(() => setViolation(null), 4000)
  }

  // Helper function: Reset inactivity timer
  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimerRef.current)
    if (!running) return

    inactivityTimerRef.current = setTimeout(() => {
      resetTestAfterViolation('⏱️ Inactivity Detected (60s)! Test restarted with reshuffled questions.')
    }, INACTIVITY_TIMEOUT)
  }

  // Shuffle questions on mount
  useEffect(() => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    setShuffledQuestions(shuffled)
    setAnswers(shuffled.map(() => null))
  }, [])

  // Anti-cheating: Tab switch detection
  useEffect(() => {
    if (!running) return
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        resetTestAfterViolation('🔴 Tab Switch Detected! Test restarted with reshuffled questions.')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [running, shuffledQuestions])

  // Anti-cheating: Window focus loss (minimize/blur)
  useEffect(() => {
    if (!running) return
    
    const handleBlur = () => {
      resetTestAfterViolation('🔴 Window Lost Focus! Test restarted with reshuffled questions.')
    }

    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [running, shuffledQuestions])

  // Anti-cheating: Copy detection
  useEffect(() => {
    if (!running) return
    
    const handleCopy = (e) => {
      e.preventDefault()
      resetTestAfterViolation('🔴 Copy Attempt Detected! Test restarted with reshuffled questions.')
    }

    document.addEventListener('copy', handleCopy)
    return () => document.removeEventListener('copy', handleCopy)
  }, [running, shuffledQuestions])

  // Anti-cheating: Fullscreen exit detection
  useEffect(() => {
    if (!running) return

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement)
      
      if (wasFullscreenRef.current && !isCurrentlyFullscreen) {
        resetTestAfterViolation('🔴 Fullscreen Exited! Test restarted with reshuffled questions.')
      }
      
      wasFullscreenRef.current = isCurrentlyFullscreen
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [running, shuffledQuestions])

  // Anti-cheating: Inactivity timeout (60 seconds)
  useEffect(() => {
    if (!running) {
      clearTimeout(inactivityTimerRef.current)
      return
    }

    // Activities to reset inactivity timer
    const handleActivity = () => {
      resetInactivityTimer()
    }

    resetInactivityTimer() // Initialize timer on test start

    document.addEventListener('mousemove', handleActivity)
    document.addEventListener('keydown', handleActivity)
    document.addEventListener('mousedown', handleActivity)
    document.addEventListener('touchstart', handleActivity)
    document.addEventListener('click', handleActivity)

    return () => {
      clearTimeout(inactivityTimerRef.current)
      document.removeEventListener('mousemove', handleActivity)
      document.removeEventListener('keydown', handleActivity)
      document.removeEventListener('mousedown', handleActivity)
      document.removeEventListener('touchstart', handleActivity)
      document.removeEventListener('click', handleActivity)
    }
  }, [running, shuffledQuestions])



  useEffect(()=>{
    if (running) {
      timerRef.current = setInterval(()=>{
        setSecondsLeft(s => {
          if (s <= 1) {
            if (index < shuffledQuestions.length - 1) {
              setIndex(i => i + 1)
              return perQuestionSeconds
            } else {
              clearInterval(timerRef.current)
              setRunning(false)
              setCompleted(true)
              return 0
            }
          }
          return s - 1
        })
      }, 1000)
    }
    return ()=> clearInterval(timerRef.current)
  }, [running, index, shuffledQuestions.length, perQuestionSeconds])

  useEffect(()=>{
    setSecondsLeft(perQuestionSeconds)
  }, [index, perQuestionSeconds])

  const start = ()=>{ setRunning(true); setCompleted(false); setIndex(0) }
  const pause = ()=>{ setRunning(false) }
  const next = ()=>{ if (index < shuffledQuestions.length - 1) setIndex(i => i + 1) }
  const prev = ()=>{ if (index > 0) setIndex(i => i - 1) }
  const finish = ()=>{ setRunning(false); setCompleted(true) }

  // initialize start time when test begins or component mounts for running tests
  useEffect(()=>{
    if (running && !startTimeRef.current) startTimeRef.current = Date.now()
  }, [running])

  useEffect(()=>{
    if (completed) {
      let correct = 0
      let totalMCQ = 0
      shuffledQuestions.forEach((q, i) => {
        if (q && typeof q === 'object' && Array.isArray(q.options)) {
          totalMCQ++
          if (answers[i] != null && answers[i] === q.answerIndex) correct++
        }
      })
      if (totalMCQ > 0) {
        const newScore = { correct, total: totalMCQ }
        setScore(newScore)
        // compute duration and accuracy
        const now = Date.now()
        const durationMs = startTimeRef.current ? (now - startTimeRef.current) : null
        const duration_seconds = durationMs ? Math.round(durationMs / 1000) : null
        const accuracy_percent = Math.round((correct/totalMCQ)*100)
        const avg_seconds_per_question = duration_seconds && totalMCQ ? +(duration_seconds / totalMCQ).toFixed(2) : null

        api.post('/scoreboard', {
          testTitle: mockTest.title || 'Mock Test',
          company: mockTest.company || null,
          role: mockTest.role || null,
          score: correct,
          totalQuestions: totalMCQ,
          duration_seconds,
          avg_seconds_per_question,
          attempts: attempts,
          accuracy_percent
        }).catch(err => console.error('Failed to save score', err))
      } else {
        setScore({ correct: 0, total: 0, unsupported: true })
      }
    }
  }, [completed, shuffledQuestions, answers])

  const format = sec => {
    const m = Math.floor(sec/60).toString().padStart(2,'0')
    const s = (sec%60).toString().padStart(2,'0')
    return `${m}:${s}`
  }

  return (
    <div className="mt-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
      {/* Violation Alert */}
      {violation && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {violation}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <div className="font-semibold text-slate-900">{mockTest.title}</div>
          <div className="text-sm text-slate-500">Question {index+1} of {shuffledQuestions.length}</div>
        </div>
        <div className="text-xl font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">{format(secondsLeft)}</div>
      </div>

      <div className="mt-3 bg-slate-50 border border-slate-200 p-4 rounded-xl min-h-[6rem]">
        {(() => {
          const q = shuffledQuestions[index]
          if (q && typeof q === 'object' && Array.isArray(q.options)) {
            return (
              <div>
                <div className="font-medium text-slate-800 mb-3">{q.text}</div>
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className={`p-3 rounded-lg border cursor-pointer transition ${
                      answers[index]===oi
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50'
                    }`}>
                      <input type="radio" name={`q-${index}`} checked={answers[index]===oi} onChange={()=>{
                        const copy = answers.slice(); copy[index] = oi; setAnswers(copy)
                      }} className="mr-2" />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
                {completed && q.answerIndex != null && (
                  <div className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-sm">
                    <div className="text-emerald-700 font-medium">Correct answer: {q.options[q.answerIndex]}</div>
                    {answers[index] != null && (answers[index] === q.answerIndex ?
                      <div className="text-emerald-700">✓ You answered correctly</div> :
                      <div className="text-red-700">✗ Your answer: {q.options[answers[index]]}</div>
                    )}
                  </div>
                )}
              </div>
            )
          }
          // fallback: plain text question
          return <div className="text-sm text-slate-700">{typeof q === 'string' ? q : (q && q.text) || 'No question'}</div>
        })()}
      </div>

      <div className="mt-3 flex gap-2 items-center flex-wrap">
        {!running && !completed && <button onClick={start} className="btn-primary text-sm">Start</button>}
        {running && <button onClick={pause} className="px-3 py-1.5 bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-sm font-medium transition">Pause</button>}
        <button onClick={prev} disabled={index===0} className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
        <button onClick={next} disabled={index===shuffledQuestions.length-1} className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
        <button onClick={finish} className="btn-secondary text-sm">Finish</button>
        <div className="ml-auto">
          <button onClick={()=>{ setRunning(false); onClose && onClose() }} className="btn-ghost text-sm">Close</button>
        </div>
      </div>

      {completed && score && !score.unsupported && (
        <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="font-semibold text-emerald-800">✓ Mock test completed</div>
          <div className="text-sm mt-2 text-slate-700">Score: <span className="font-bold text-emerald-700">{score.correct}/{score.total}</span> ({Math.round((score.correct/score.total)*100)}%)</div>
          <div className="text-xs text-slate-500 mt-1">Score saved to scoreboard. You can review answers and retake the test later.</div>
        </div>
      )}

      {completed && score?.unsupported && (
        <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="font-semibold text-amber-800">Scoring unavailable for this mock</div>
          <div className="text-sm mt-2 text-slate-700">This mock does not contain answer keys. Use the scored MCQ mock to update cognitive profile and AI roadmap.</div>
        </div>
      )}
    </div>
  )
}
