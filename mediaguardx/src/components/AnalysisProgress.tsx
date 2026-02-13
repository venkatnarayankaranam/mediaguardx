import {
  Brain,
  Calculator,
  CheckCircle,
  Search,
  Upload,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface AnalysisProgressProps {
  currentStep: number;
  isComplete: boolean;
}

interface StepDefinition {
  label: string;
  icon: ReactNode;
}

const STEPS: StepDefinition[] = [
  { label: 'Uploading', icon: <Upload className="w-5 h-5" /> },
  { label: 'AI Detection', icon: <Brain className="w-5 h-5" /> },
  { label: 'Metadata Analysis', icon: <Search className="w-5 h-5" /> },
  { label: 'Computing Score', icon: <Calculator className="w-5 h-5" /> },
  { label: 'Complete', icon: <CheckCircle className="w-5 h-5" /> },
];

function getStepState(
  stepIndex: number,
  currentStep: number,
  isComplete: boolean,
): 'completed' | 'active' | 'pending' {
  if (isComplete) return 'completed';
  if (stepIndex < currentStep) return 'completed';
  if (stepIndex === currentStep) return 'active';
  return 'pending';
}

function StepIcon({ state, icon }: { state: 'completed' | 'active' | 'pending'; icon: ReactNode }) {
  switch (state) {
    case 'completed':
      return (
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
          <CheckCircle className="w-5 h-5" />
        </div>
      );
    case 'active':
      return (
        <div className="w-10 h-10 rounded-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center text-indigo-400 animate-pulse">
          {icon}
        </div>
      );
    case 'pending':
      return (
        <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-500">
          {icon}
        </div>
      );
  }
}

function ConnectingLine({ state }: { state: 'completed' | 'active' | 'pending' }) {
  let colorClass: string;

  switch (state) {
    case 'completed':
      colorClass = 'bg-emerald-500';
      break;
    case 'active':
      colorClass = 'bg-gradient-to-r from-indigo-500 to-slate-700';
      break;
    default:
      colorClass = 'bg-slate-700';
      break;
  }

  return (
    <div className={`flex-1 h-0.5 mx-2 rounded-full ${colorClass}`} />
  );
}

export default function AnalysisProgress({ currentStep, isComplete }: AnalysisProgressProps) {
  return (
    <div className="w-full py-6">
      {/* Horizontal step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const state = getStepState(index, currentStep, isComplete);
          const isLastStep = index === STEPS.length - 1;

          return (
            <div
              key={step.label}
              className={`flex items-center ${isLastStep ? '' : 'flex-1'}`}
            >
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-2">
                <StepIcon state={state} icon={step.icon} />
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    state === 'completed'
                      ? 'text-emerald-400'
                      : state === 'active'
                        ? 'text-indigo-400'
                        : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line between steps */}
              {!isLastStep && (
                <ConnectingLine
                  state={getStepState(index, currentStep - 1, isComplete)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
