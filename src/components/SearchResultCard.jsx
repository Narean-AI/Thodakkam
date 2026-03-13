import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchResultCard({ item }){
  const nav = useNavigate()
  const [showDetails, setShowDetails] = useState(true)

  const open = () => {
    if (item && item.id) nav(`/problem/${encodeURIComponent(item.id)}`)
  }

  const extras = item.extras || {}
  const mockInterview = extras.mockInterview || []
  const resources = extras.resources || []
  const generatedPrompt = extras.generatedPrompt || ''

  return (
    <div className="card flex flex-col gap-4 p-4 rounded-xl">
      {/* Header - Clickable */}
      <div onClick={open} className="flex flex-col md:flex-row gap-4 items-start cursor-pointer hover:bg-indigo-50 p-2 rounded-lg transition">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
          <p className="text-sm text-slate-600">{item.company} • <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700">{item.difficulty}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-700 text-right">
            <div className="font-semibold">Credibility</div>
            <div className="text-xs text-slate-600">{item.credibility}%</div>
          </div>
        </div>
      </div>

      {/* Details Toggle */}
      <button 
        onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails) }}
        className="text-sm text-indigo-700 hover:text-indigo-800 transition text-left font-medium"
      >
        {showDetails ? '▼ Hide Details' : '▶ Show Details'}
      </button>

      {/* Expandable Details Section */}
      {showDetails && (
        <div className="space-y-4 border-t border-slate-200 pt-4">
          
          {/* Generated Practice Prompt */}
          {generatedPrompt && (
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <h4 className="text-sm font-semibold text-indigo-700 mb-2">📝 Practice Prompt</h4>
              <p className="text-sm text-slate-700 italic">{generatedPrompt}</p>
            </div>
          )}

          {/* Mock Interview Rounds */}
          {mockInterview && mockInterview.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-2">🎯 Mock Interview ({mockInterview.length} rounds)</h4>
              <div className="space-y-2">
                {mockInterview.map((round, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="font-medium text-emerald-700">{round.title}</div>
                    <div className="text-xs text-slate-600">⏱ ~{round.estimatedMinutes} mins • {round.questions?.length || 0} questions</div>
                    {(round.questions || []).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {(round.questions || []).slice(0, 3).map((q, qidx) => (
                          <li key={qidx} className="text-xs text-slate-700 ml-2">• {q.text || q}</li>
                        ))}
                        {(round.questions || []).length > 3 && (
                          <li className="text-xs text-slate-500 ml-2">• +{(round.questions || []).length - 3} more questions</li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources & References */}
          {resources && resources.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-700 mb-2">🔗 Resources ({resources.length})</h4>
              <div className="space-y-2">
                {resources.slice(0, 4).map((resource, idx) => (
                  <a
                    key={idx}
                    href={resource.startsWith('http') ? resource : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs bg-white p-2 rounded-lg hover:bg-indigo-50 transition border border-slate-200 truncate text-indigo-700 hover:text-indigo-800"
                    title={resource}
                  >
                    🌐 {resource.length > 70 ? resource.slice(0, 67) + '...' : resource}
                  </a>
                ))}
                {resources.length > 4 && (
                  <div className="text-xs text-slate-500 p-2 text-center">
                    +{resources.length - 4} more resources
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Full Details Button */}
          <button
            onClick={open}
            className="w-full btn-primary py-2 text-sm font-semibold"
          >
            📄 View Full Details
          </button>
        </div>
      )}
    </div>
  )
}
