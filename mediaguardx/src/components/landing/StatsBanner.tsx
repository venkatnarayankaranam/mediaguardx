import { Activity, BarChart3, Layers, ScanLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { icon: BarChart3, value: '99.2%', label: 'Accuracy' },
  { icon: ScanLine, value: '50K+', label: 'Scans' },
  { icon: Activity, value: 'Real-time', label: 'Analysis' },
  { icon: Layers, value: 'Multi-layer', label: 'Detection' },
];

export default function StatsBanner(): JSX.Element {
  return (
    <section className="px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="card grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {STATS.map(function renderStat(stat) {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-indigo-400">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
