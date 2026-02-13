import { Upload, Cpu, ClipboardCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: Upload,
    title: 'Upload',
    description: 'Upload your media file (image, video, or audio)',
  },
  {
    number: 2,
    icon: Cpu,
    title: 'Analyze',
    description: 'Our AI analyzes multiple layers for deepfake indicators',
  },
  {
    number: 3,
    icon: ClipboardCheck,
    title: 'Results',
    description: 'Get a detailed trust score and anomaly report',
  },
];

export default function HowItWorks(): JSX.Element {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-100 mb-4">
          How It Works
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-16">
          Three simple steps to verify the authenticity of any media file.
        </p>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Connecting lines (desktop only) */}
          <div className="hidden md:block absolute top-14 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5">
            <div className="w-full h-full bg-gradient-to-r from-indigo-500/40 via-indigo-500/20 to-indigo-500/40" />
          </div>

          {STEPS.map(function renderStep(step) {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Numbered circle */}
                <div className="relative z-10 mb-6">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-glow-brand">
                    <span className="text-lg font-bold text-white">{step.number}</span>
                  </div>
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-indigo-400" />
                </div>

                {/* Text */}
                <h3 className="text-xl font-semibold text-slate-100 mb-2">{step.title}</h3>
                <p className="text-slate-400 max-w-xs">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
