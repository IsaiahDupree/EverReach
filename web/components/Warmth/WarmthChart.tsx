'use client'

import { formatDate } from '@/lib/utils'

interface WarmthDataPoint {
  date: string
  score: number
}

interface WarmthChartProps {
  data: WarmthDataPoint[]
  height?: number
  className?: string
}

export function WarmthChart({ data, height = 200, className }: WarmthChartProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50"
        style={{ height: `${height}px` }}
      >
        <p className="text-gray-500 text-sm">No warmth history available</p>
      </div>
    )
  }

  const maxScore = 100
  const minScore = 0
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const width = 600
  
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  
  // Calculate points for the line
  const points = data.map((point, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth
    const y = padding.top + chartHeight - ((point.score - minScore) / (maxScore - minScore)) * chartHeight
    return { x, y, ...point }
  })
  
  // Create SVG path
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  
  // Create area fill path
  const areaData = `${pathData} L ${points[points.length - 1]?.x ?? padding.left} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`
  
  // Get color based on latest score
  const latestScore = data[data.length - 1]?.score ?? 0
  const getColor = () => {
    if (latestScore >= 70) return '#14b8a6' // teal
    if (latestScore >= 40) return '#fbbf24' // yellow
    if (latestScore >= 20) return '#60a5fa' // blue
    return '#ef4444' // red
  }

  return (
    <div className={className}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding.top + chartHeight - ((value - minScore) / (maxScore - minScore)) * chartHeight
          return (
            <g key={value}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-gray-500"
              >
                {value}
              </text>
            </g>
          )
        })}
        
        {/* Area fill */}
        <path
          d={areaData}
          fill={getColor()}
          fillOpacity="0.1"
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={getColor()}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="white"
              stroke={getColor()}
              strokeWidth="2"
            />
            <title>{`${formatDate(point.date)}: ${point.score}`}</title>
          </g>
        ))}
        
        {/* X-axis labels */}
        {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0).map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            {formatDate(point.date)}
          </text>
        ))}
      </svg>
    </div>
  )
}
