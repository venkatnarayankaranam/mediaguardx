import { useEffect, useState } from 'react';

interface TrustScoreGaugeProps {
  score: number;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getStatusLabel(score: number): string {
  if (score >= 70) return 'Authentic';
  if (score >= 40) return 'Suspicious';
  return 'Deepfake';
}

function getStatusColorClass(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

export default function TrustScoreGauge({ score, size = 200 }: TrustScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(timeout);
  }, [score]);

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Semi-circle arc from 180 degrees (left) to 0 degrees (right)
  const circumference = Math.PI * radius;
  const filledLength = (animatedScore / 100) * circumference;
  const dashOffset = circumference - filledLength;

  // Arc path: semi-circle from left to right across the top
  const arcStartX = centerX - radius;
  const arcStartY = centerY;
  const arcEndX = centerX + radius;
  const arcEndY = centerY;

  const arcPath = `M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 1 ${arcEndX} ${arcEndY}`;

  const color = getScoreColor(score);
  const statusLabel = getStatusLabel(score);
  const statusClass = getStatusColorClass(score);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg
        width={size}
        height={size * 0.6}
        viewBox={`0 0 ${size} ${size * 0.6}`}
        className="overflow-visible"
      >
        {/* Background arc (track) */}
        <path
          d={arcPath}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc (score) */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />

        {/* Score number */}
        <text
          x={centerX}
          y={centerY - size * 0.02}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={size * 0.2}
          fontWeight="bold"
          fontFamily="inherit"
        >
          {score}
        </text>

        {/* "Trust Score" label */}
        <text
          x={centerX}
          y={centerY + size * 0.12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#94a3b8"
          fontSize={size * 0.07}
          fontFamily="inherit"
        >
          Trust Score
        </text>
      </svg>

      <span className={`text-sm font-semibold mt-1 ${statusClass}`}>
        {statusLabel}
      </span>
    </div>
  );
}
