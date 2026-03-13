import React from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function SmallLine({ data }){
  return (
    <div className="w-full h-32">
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke="var(--chart-main)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
