import React from 'react'

export default function CircularProgress({ value=75, size=120 }){
  const radius = 48
  const stroke = 8
  const normalizedRadius = radius - stroke * 0.5
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <svg height={size} width={size} className="mx-auto">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%">
          <stop offset="0%" stopColor="var(--chart-accent)" />
          <stop offset="100%" stopColor="var(--chart-main)" />
        </linearGradient>
      </defs>
      <circle
        stroke="rgba(0,0,0,0.06)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={size/2}
        cy={size/2}
      />
      <circle
        stroke="url(#g)"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset }}
        r={normalizedRadius}
        cx={size/2}
        cy={size/2}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#07111a" fontSize="18">{value}%</text>
    </svg>
  )
}
