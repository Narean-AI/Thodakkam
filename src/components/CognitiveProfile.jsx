import React from 'react'

// Expects `studentData` shaped like server's admin analytics response
export default function CognitiveProfile({ studentData }) {
  if (!studentData) return null

  const { summary = {}, subjectScores = [], testResults = [] } = studentData

  // Accuracy
  const accuracy = summary.avgScorePercentage || 0

  // Retry count = total attempts across all subjects
  const retryCount = subjectScores.reduce((acc, s) => acc + (s.attempts || 0), 0)

  // Topic-wise performance
  const topics = subjectScores.map(s => ({
    topic: s.subject,
    attempts: s.attempts || 0,
    avgScore: s.avgScore || 0
  }))

  // Speed estimation: look for duration/time_taken fields in testResults attempts
  // If tests include `duration_seconds` or `duration_ms`, compute avg seconds per question
  let totalTimeSeconds = 0
  let timeCount = 0
  testResults.forEach(t => {
    const d = t.duration_seconds || (t.duration_ms ? Math.round(t.duration_ms / 1000) : null)
    if (d && t.total_questions) {
      totalTimeSeconds += d
      timeCount += t.total_questions
    }
  })
  const avgSecondsPerQuestion = timeCount > 0 ? Math.round(totalTimeSeconds / timeCount) : null

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold mb-3">Cognitive Profile</h3>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
          <div className="text-sm text-slate-600">Accuracy</div>
          <div className="text-2xl font-bold text-emerald-700">{accuracy}%</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
          <div className="text-sm text-slate-600">Retries</div>
          <div className="text-2xl font-bold text-amber-700">{retryCount}</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
          <div className="text-sm text-slate-600">Speed</div>
          <div className="text-2xl font-bold text-sky-700">{avgSecondsPerQuestion ? `${avgSecondsPerQuestion}s/q` : 'N/A'}</div>
        </div>
      </div>

    </div>
  )
}
