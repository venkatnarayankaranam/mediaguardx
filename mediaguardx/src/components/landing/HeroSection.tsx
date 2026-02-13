import { Link } from 'react-router-dom';
import { Shield, ScanLine } from 'lucide-react';

export default function HeroSection(): JSX.Element {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left column - copy */}
        <div className="text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
            <span className="text-gradient-brand">Detect Deepfakes</span>
            <br />
            <span className="text-slate-100">with AI Precision</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            Protect yourself from synthetic media with cutting-edge multi-layer
            analysis. Upload images, videos, or audio and get instant trust
            scores powered by state-of-the-art AI models.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link
              to="/register"
              className="btn-primary px-8 py-3.5 text-base"
            >
              Get Started
            </Link>
            <a
              href="#how-it-works"
              className="btn-secondary px-8 py-3.5 text-base"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Right column - animated graphic */}
        <div className="flex items-center justify-center lg:justify-end">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
            {/* Outer pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" style={{ animationDuration: '3s' }} />

            {/* Middle rotating ring */}
            <div
              className="absolute inset-4 rounded-full border border-dashed border-indigo-400/30"
              style={{ animation: 'spin 20s linear infinite' }}
            />

            {/* Inner glow circle */}
            <div className="absolute inset-8 rounded-full bg-indigo-500/5 border border-indigo-500/20 animate-pulse-slow" />

            {/* Shield icon center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -inset-6 rounded-full bg-indigo-500/15 blur-xl animate-pulse-slow" />
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gradient-brand rounded-2xl flex items-center justify-center shadow-glow-brand">
                  <Shield className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                </div>
              </div>
            </div>

            {/* Orbiting scan icon */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2"
              style={{ animation: 'orbit 8s linear infinite', transformOrigin: '0 180px' }}
            >
              <div className="w-10 h-10 bg-slate-800 border border-indigo-500/40 rounded-lg flex items-center justify-center shadow-glow-brand">
                <ScanLine className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            {/* Corner accent dots */}
            <div className="absolute top-8 right-8 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <div className="absolute bottom-12 left-6 w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-slow" />
            <div className="absolute top-1/3 left-2 w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Inline keyframes for the orbit animation */}
      <style>{`
        @keyframes orbit {
          from { transform: translateX(-50%) rotate(0deg); }
          to   { transform: translateX(-50%) rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
