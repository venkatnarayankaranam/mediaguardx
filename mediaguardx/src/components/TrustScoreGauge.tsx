import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface TrustScoreGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export default function TrustScoreGauge({ score, size = 200, showLabel = true }: TrustScoreGaugeProps) {
  const data = [
    { name: 'Trust', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  const getColor = (score: number) => {
    if (score >= 80) return '#14b8a6'; // teal-500
    if (score >= 50) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const getStatus = (score: number) => {
    if (score >= 80) return 'Authentic';
    if (score >= 50) return 'Suspected';
    return 'Deepfake';
  };

  const COLORS = [getColor(score), '#1e293b'];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.35}
              outerRadius={size * 0.5}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {showLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold" style={{ color: getColor(score) }}>
              {score}
            </div>
            <div className="text-sm text-gray-400 mt-1">Trust Score</div>
            <div className="text-xs text-gray-500 mt-1">{getStatus(score)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

