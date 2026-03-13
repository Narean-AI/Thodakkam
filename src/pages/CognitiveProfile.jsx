import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

export default function CognitiveProfile(){
  const { userId } = useParams()
  const [data,setData] = useState(null)
  const [error,setError] = useState(null)

  useEffect(()=>{
    api.get(`/cognitive/${userId}`).then(res=>setData(res.data)).catch(()=>setError('Failed to load'))
  },[userId])

  if (error) return <div className="text-red-700">{error}</div>
  if (!data) return <div className="text-slate-600">Loading...</div>

  const pieData = data.mistakeTypes || [{name:'Logic', value:40},{name:'Syntax', value:30},{name:'Interpret', value:30}]

  return (
    <div className="app-container max-w-5xl">
      <div className="mb-4">
        <h1 className="page-title">Cognitive Profile</h1>
        <p className="page-subtitle">Understand your speed, error patterns, and decision behavior.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-4">
        <h4 className="font-semibold text-slate-900">Time per question</h4>
        <div style={{height:220}} className="mt-2">
          <ResponsiveContainer>
            <LineChart data={data.timePerQuestion || []}>
              <Line dataKey="avg" stroke="#7c3aed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h4 className="font-semibold text-slate-900">Mistake Types</h4>
        <div style={{height:220}} className="mt-2">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} fill="#8884d8">
                {pieData.map((_,i)=>(<Cell key={i} fill={['#7c3aed','#4f46e5','#06b6d4'][i%3]} />))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4 md:col-span-2">
        <h4 className="font-semibold text-slate-900">Overthinking vs Rushing</h4>
        <div style={{height:240}} className="mt-2">
          <ResponsiveContainer>
            <BarChart data={data.speedBalance || [{name:'Overthink', v:40},{name:'Rush', v:60}] }>
              <XAxis dataKey="name" />
              <YAxis />
              <Bar dataKey="v" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4 md:col-span-2">
        <h4 className="font-semibold text-slate-900">Behavioral Insights</h4>
        <div className="mt-2 grid gap-3">
          {(data.insights || ['Keeps calm under pressure','Needs faster read time']).map((t,i)=>(<div key={i} className="p-3 bg-white border border-slate-200 rounded text-slate-700">{t}</div>))}
        </div>
      </div>
      </div>
    </div>
  )
}
