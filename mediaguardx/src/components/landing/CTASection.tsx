import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CTASection(): JSX.Element {
  return (
    <section className="py-20 lg:py-28 px-4">
      <div className="max-w-5xl mx-auto relative overflow-hidden rounded-2xl">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.3),transparent_60%)]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative px-6 py-16 sm:px-12 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Start Protecting Your Media Today
          </h2>
          <p className="text-lg text-indigo-100/80 max-w-2xl mx-auto mb-10">
            Join thousands of journalists, security professionals, and
            researchers who trust MediaGuardX to verify the authenticity of
            digital media.
          </p>

          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors duration-200 shadow-lg"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
