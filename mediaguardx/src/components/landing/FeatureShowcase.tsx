import { Brain, Layers, Video, FileText, Mic, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: 'AI Deepfake Detection',
    description:
      'Advanced neural networks detect face swaps, lip-sync manipulation, and GAN-generated content with industry-leading accuracy.',
  },
  {
    icon: Layers,
    title: 'Multi-layer Analysis',
    description:
      'Combines pixel-level forensics, frequency-domain analysis, and metadata inspection for comprehensive verification.',
  },
  {
    icon: Video,
    title: 'Real-time Monitoring',
    description:
      'Live camera feed analysis detects deepfakes in video calls, streams, and surveillance footage as they happen.',
  },
  {
    icon: FileText,
    title: 'Forensic Reports',
    description:
      'Generate tamper-proof PDF reports with heatmaps, anomaly breakdowns, and chain-of-custody documentation.',
  },
  {
    icon: Mic,
    title: 'Audio Analysis',
    description:
      'Detect voice cloning, spliced audio, and AI-generated speech through spectrogram and prosody analysis.',
  },
  {
    icon: Search,
    title: 'Metadata Inspection',
    description:
      'Deep inspection of EXIF data, file signatures, and encoding artifacts to reveal hidden signs of tampering.',
  },
];

export default function FeatureShowcase(): JSX.Element {
  return (
    <section className="py-20 lg:py-28 px-4 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-100 mb-4">
          Powerful Detection Features
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-16">
          A comprehensive toolkit designed to catch every form of media
          manipulation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(function renderFeature(feature) {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="glass rounded-xl p-6 group hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:bg-indigo-500/20 transition-colors duration-300">
                  <Icon className="w-6 h-6 text-indigo-400" />
                </div>

                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
